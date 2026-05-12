import { join, resolve } from "node:path";
import { createId } from "@personal-agent/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { SessionStoreDatabase } from "./db.js";
import { sessionEntries, sessions, workspaces } from "./schema.js";
import type {
  SessionEntryRecord,
  SessionRecord,
  WorkspaceRecord,
  WorkspaceResolveInput
} from "./types.js";

export type SessionRepositoryErrorCode =
  | "duplicate_active_session"
  | "missing_workspace"
  | "missing_parent_session"
  | "missing_session"
  | "missing_session_entry";

export class SessionRepositoryError extends Error {
  readonly code: SessionRepositoryErrorCode;

  constructor(code: SessionRepositoryErrorCode, message: string) {
    super(message);
    this.name = "SessionRepositoryError";
    this.code = code;
  }
}

export interface WorkspaceRepository {
  create(workspace: WorkspaceRecord): Promise<void>;
  getById(id: string): Promise<WorkspaceRecord | null>;
  getByWorkspaceKey(workspaceKey: string): Promise<WorkspaceRecord | null>;
  resolveOrCreate(input: WorkspaceResolveInput): Promise<WorkspaceRecord>;
}

export interface CreateWorkspaceRepositoryInput {
  idFactory?: () => string;
  now?: () => string;
  workspaceRoot: string;
}

export function createWorkspaceRepository(
  store: Pick<SessionStoreDatabase, "db">,
  input: CreateWorkspaceRepositoryInput
): WorkspaceRepository {
  const idFactory = input.idFactory ?? (() => createId("workspace"));
  const now = input.now ?? (() => new Date().toISOString());

  return {
    async create(workspace) {
      await store.db.insert(workspaces).values(workspace);
    },

    async getById(id) {
      return (await store.db.select().from(workspaces).where(eq(workspaces.id, id)).get()) ?? null;
    },

    async getByWorkspaceKey(workspaceKey) {
      return (
        (await store.db
          .select()
          .from(workspaces)
          .where(eq(workspaces.workspaceKey, workspaceKey))
          .get()) ?? null
      );
    },

    async resolveOrCreate(resolveInput) {
      const resolved = resolveWorkspace(input.workspaceRoot, resolveInput);
      const existing = await store.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.workspaceKey, resolved.workspaceKey))
        .get();
      const timestamp = now();

      if (existing !== undefined) {
        await store.db
          .update(workspaces)
          .set({
            lastUsedAt: timestamp,
            updatedAt: timestamp
          })
          .where(eq(workspaces.id, existing.id));

        return {
          ...existing,
          lastUsedAt: timestamp,
          updatedAt: timestamp
        };
      }

      const workspace: WorkspaceRecord = {
        id: idFactory(),
        workspaceKey: resolved.workspaceKey,
        agentId: resolveInput.agentId,
        platform: resolved.platform,
        chatId: resolved.chatId,
        threadId: resolveInput.threadId ?? null,
        parentWorkspaceId: null,
        rootPath: resolved.rootPath,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastUsedAt: timestamp
      };

      await store.db.insert(workspaces).values(workspace);

      return workspace;
    }
  };
}

export function resolveWorkspace(
  workspaceRoot: string,
  input: WorkspaceResolveInput
): Pick<WorkspaceRecord, "workspaceKey" | "platform" | "chatId" | "rootPath"> {
  if (input.source === "cli") {
    const cwd = input.cwd === undefined ? undefined : resolve(input.cwd);

    if (cwd === undefined) {
      throw new Error("CLI workspace resolution requires cwd");
    }

    return {
      workspaceKey: `workspace:cli:local:${cwd}:${input.agentId}`,
      platform: "cli",
      chatId: cwd,
      rootPath: cwd
    };
  }

  if (input.source === "scheduler") {
    throw new Error("Scheduler workspace resolution requires an existing workspace id");
  }

  const platform = input.platform ?? input.source;

  if (input.chatId === undefined || input.chatId.length === 0) {
    throw new Error(`${input.source} workspace resolution requires chatId`);
  }

  if (input.scope === "thread" && (input.threadId === undefined || input.threadId.length === 0)) {
    throw new Error("Thread workspace resolution requires threadId");
  }

  const identity =
    input.scope === "thread" ? `${input.chatId}:thread:${input.threadId}` : input.chatId;

  return {
    workspaceKey: `workspace:${platform}:${input.scope}:${identity}:${input.agentId}`,
    platform,
    chatId: input.chatId,
    rootPath: join(workspaceRoot, platform, input.chatId, "agents", input.agentId)
  };
}

export interface SessionRepository {
  create(session: SessionRecord): Promise<void>;
  getById(id: string): Promise<SessionRecord | null>;
  getActiveBySessionKey(sessionKey: string): Promise<SessionRecord | null>;
  listByWorkspace(workspaceId: string): Promise<SessionRecord[]>;
  archive(id: string): Promise<SessionRecord>;
  close(id: string): Promise<SessionRecord>;
  setActiveLeaf(sessionId: string, entryId: string): Promise<SessionRecord>;
  clearActiveLeaf(sessionId: string): Promise<SessionRecord>;
  setLastMessageAt(sessionId: string, lastMessageAt: string): Promise<SessionRecord>;
}

export interface CreateSessionRepositoryInput {
  now?: () => string;
}

export function createSessionRepository(
  store: Pick<SessionStoreDatabase, "db">,
  input: CreateSessionRepositoryInput = {}
): SessionRepository {
  const now = input.now ?? (() => new Date().toISOString());

  return {
    async create(session) {
      await assertWorkspaceExists(store, session.workspaceId);

      if (session.parentSessionId !== null) {
        await assertParentSessionExists(store, session.parentSessionId);
      }

      if (session.status === "active") {
        const existingActive = await getActiveSessionByKey(store, session.sessionKey);

        if (existingActive !== null) {
          throw new SessionRepositoryError(
            "duplicate_active_session",
            `Active session already exists for session key ${session.sessionKey}`
          );
        }
      }

      await store.db.insert(sessions).values(session);
    },

    async getById(id) {
      return (await store.db.select().from(sessions).where(eq(sessions.id, id)).get()) ?? null;
    },

    async getActiveBySessionKey(sessionKey) {
      return getActiveSessionByKey(store, sessionKey);
    },

    async listByWorkspace(workspaceId) {
      return await store.db.select().from(sessions).where(eq(sessions.workspaceId, workspaceId));
    },

    async archive(id) {
      return updateSessionStatus(store, id, "archived", now());
    },

    async close(id) {
      return updateSessionStatus(store, id, "closed", now());
    },

    async setActiveLeaf(sessionId, entryId) {
      await assertSessionEntryExists(store, sessionId, entryId);

      return updateSession(store, sessionId, {
        activeLeafEntryId: entryId,
        updatedAt: now()
      });
    },

    async clearActiveLeaf(sessionId) {
      return updateSession(store, sessionId, {
        activeLeafEntryId: null,
        updatedAt: now()
      });
    },

    async setLastMessageAt(sessionId, lastMessageAt) {
      return updateSession(store, sessionId, {
        lastMessageAt,
        updatedAt: now()
      });
    }
  };
}

async function updateSessionStatus(
  store: Pick<SessionStoreDatabase, "db">,
  id: string,
  status: SessionRecord["status"],
  timestamp: string
): Promise<SessionRecord> {
  return updateSession(store, id, {
    status,
    updatedAt: timestamp
  });
}

async function getActiveSessionByKey(
  store: Pick<SessionStoreDatabase, "db">,
  sessionKey: string
): Promise<SessionRecord | null> {
  return (
    (await store.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.sessionKey, sessionKey), eq(sessions.status, "active")))
      .get()) ?? null
  );
}

async function updateSession(
  store: Pick<SessionStoreDatabase, "db">,
  id: string,
  values: Partial<typeof sessions.$inferInsert>
): Promise<SessionRecord> {
  const existing = await store.db.select().from(sessions).where(eq(sessions.id, id)).get();

  if (existing === undefined) {
    throw new SessionRepositoryError("missing_session", `Session ${id} does not exist`);
  }

  await store.db.update(sessions).set(values).where(eq(sessions.id, id));

  const updated = await store.db.select().from(sessions).where(eq(sessions.id, id)).get();

  if (updated === undefined) {
    throw new SessionRepositoryError("missing_session", `Session ${id} does not exist`);
  }

  return updated;
}

async function assertWorkspaceExists(
  store: Pick<SessionStoreDatabase, "db">,
  workspaceId: string
): Promise<void> {
  const workspace = await store.db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .get();

  if (workspace === undefined) {
    throw new SessionRepositoryError(
      "missing_workspace",
      `Workspace ${workspaceId} does not exist`
    );
  }
}

async function assertParentSessionExists(
  store: Pick<SessionStoreDatabase, "db">,
  sessionId: string
): Promise<void> {
  const session = await store.db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (session === undefined) {
    throw new SessionRepositoryError(
      "missing_parent_session",
      `Parent session ${sessionId} does not exist`
    );
  }
}

async function assertSessionExists(
  store: Pick<SessionStoreDatabase, "db">,
  sessionId: string
): Promise<void> {
  const session = await store.db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (session === undefined) {
    throw new SessionRepositoryError("missing_session", `Session ${sessionId} does not exist`);
  }
}

async function assertSessionEntryExists(
  store: Pick<SessionStoreDatabase, "db">,
  sessionId: string,
  entryId: string
): Promise<void> {
  const entry = await store.db
    .select({ id: sessionEntries.id })
    .from(sessionEntries)
    .where(and(eq(sessionEntries.sessionId, sessionId), eq(sessionEntries.id, entryId)))
    .get();

  if (entry === undefined) {
    throw new SessionRepositoryError(
      "missing_session_entry",
      `Session entry ${entryId} does not exist on session ${sessionId}`
    );
  }
}

export interface SessionEntryRepository {
  getById(id: string): Promise<SessionEntryRecord | null>;
  append(entry: SessionEntryRecord): Promise<void>;
  listBySession(sessionId: string): Promise<SessionEntryRecord[]>;
  getChildren(sessionId: string, parentEntryId: string | null): Promise<SessionEntryRecord[]>;
  listActiveBranch(sessionId: string): Promise<SessionEntryRecord[]>;
  moveActiveLeaf(sessionId: string, entryId: string | null): Promise<SessionRecord>;
  search(sessionId: string, query: string): Promise<SessionEntrySearchResult[]>;
}

export interface SessionEntrySearchResult {
  entry: SessionEntryRecord;
}

export interface CreateSessionEntryRepositoryInput {
  now?: () => string;
}

export function createSessionEntryRepository(
  store: Pick<SessionStoreDatabase, "db" | "sqlite">,
  input: CreateSessionEntryRepositoryInput = {}
): SessionEntryRepository {
  const now = input.now ?? (() => new Date().toISOString());

  return {
    async getById(id) {
      return getSessionEntryById(store, id);
    },

    async append(entry) {
      await assertSessionExists(store, entry.sessionId);

      if (entry.parentEntryId !== null) {
        await assertSessionEntryExists(store, entry.sessionId, entry.parentEntryId);
      }

      await store.db.insert(sessionEntries).values(entry);

      if (entry.entryType === "message") {
        await updateSession(store, entry.sessionId, {
          lastMessageAt: entry.createdAt,
          updatedAt: now()
        });
      }
    },

    async listBySession(sessionId) {
      return await store.db
        .select()
        .from(sessionEntries)
        .where(eq(sessionEntries.sessionId, sessionId))
        .orderBy(asc(sessionEntries.createdAt), asc(sessionEntries.id));
    },

    async getChildren(sessionId, parentEntryId) {
      const parentPredicate =
        parentEntryId === null
          ? and(eq(sessionEntries.sessionId, sessionId), isNull(sessionEntries.parentEntryId))
          : and(
              eq(sessionEntries.sessionId, sessionId),
              eq(sessionEntries.parentEntryId, parentEntryId)
            );

      return await store.db
        .select()
        .from(sessionEntries)
        .where(parentPredicate)
        .orderBy(asc(sessionEntries.createdAt), asc(sessionEntries.id));
    },

    async listActiveBranch(sessionId) {
      await assertSessionExists(store, sessionId);

      const rows = store.sqlite
        .query<{ id: string }, [string]>(
          `
            WITH RECURSIVE branch(id, parent_entry_id, depth) AS (
              SELECT entry.id, entry.parent_entry_id, 0
              FROM session_entries entry
              JOIN sessions session ON session.active_leaf_entry_id = entry.id
              WHERE session.id = ?

              UNION ALL

              SELECT parent.id, parent.parent_entry_id, branch.depth + 1
              FROM session_entries parent
              JOIN branch ON branch.parent_entry_id = parent.id
            )
            SELECT id
            FROM branch
            ORDER BY depth DESC;
          `
        )
        .all(sessionId);

      const entries: SessionEntryRecord[] = [];

      for (const row of rows) {
        const entry = await getSessionEntryById(store, row.id);

        if (entry !== null) {
          entries.push(entry);
        }
      }

      return entries;
    },

    async moveActiveLeaf(sessionId, entryId) {
      if (entryId !== null) {
        await assertSessionEntryExists(store, sessionId, entryId);
      }

      return updateSession(store, sessionId, {
        activeLeafEntryId: entryId,
        updatedAt: now()
      });
    },

    async search(sessionId, query) {
      await assertSessionExists(store, sessionId);

      const rows = store.sqlite
        .query<{ entryId: string }, [string, string]>(
          `
            SELECT entry_id AS entryId
            FROM session_entries_fts
            WHERE session_id = ?
              AND session_entries_fts MATCH ?
            ORDER BY rank, entry_id ASC;
          `
        )
        .all(sessionId, query);
      const results: SessionEntrySearchResult[] = [];

      for (const row of rows) {
        const entry = await getSessionEntryById(store, row.entryId);

        if (entry !== null) {
          results.push({ entry });
        }
      }

      return results;
    }
  };
}

async function getSessionEntryById(
  store: Pick<SessionStoreDatabase, "db">,
  id: string
): Promise<SessionEntryRecord | null> {
  return (
    (await store.db.select().from(sessionEntries).where(eq(sessionEntries.id, id)).get()) ?? null
  );
}
