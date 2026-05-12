import type { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAppConfig } from "@personal-agent/config";
import { eq } from "drizzle-orm";
import { listAppliedMigrations, openSessionStore } from "./db.js";
import { sessionEntries, sessions, workspaces } from "./schema.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const tempDir of tempDirs.splice(0)) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("session-store database bootstrap", () => {
  test("opens the configured database path", async () => {
    const tempDir = await createTempDir();
    const databasePath = join(tempDir, "state", "state.db");
    const store = await openSessionStore({
      config: {
        ...loadAppConfig(),
        state: { databasePath }
      }
    });

    try {
      expect(store.path).toBe(databasePath);
      expect(store.listAppliedMigrations()).toHaveLength(2);
      expect(readForeignKeyPragma(store.sqlite)).toBe(1);

      const tables = listTables(store.sqlite);
      expect(tables).toEqual(
        expect.arrayContaining(["sessions", "session_entries", "session_entries_fts", "workspaces"])
      );
      expect(tables).not.toContain("approvals");
      expect(tables).not.toContain("jobs");
      expect(tables).not.toContain("job_runs");
      expect(tables).not.toContain("job_deliveries");
      expect(tables).not.toContain("memory_entries");
      expect(tables).not.toContain("transcripts");
      expect(tables).not.toContain("transcripts_fts");
    } finally {
      store.close();
    }
  });

  test("runs Drizzle migrations exactly once when bootstrap is repeated", async () => {
    const tempDir = await createTempDir();
    const databasePath = join(tempDir, "state", "test.db");

    const firstStore = await openSessionStore({ databasePath });
    firstStore.close();

    const secondStore = await openSessionStore({ databasePath });

    try {
      expect(secondStore.listAppliedMigrations()).toHaveLength(2);
      expect(countRows(secondStore.sqlite, "__drizzle_migrations")).toBe(2);
    } finally {
      secondStore.close();
    }
  });

  test("exposes queryable Drizzle migration metadata", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      expect(listAppliedMigrations(store.sqlite)).toEqual([
        expect.objectContaining({
          hash: expect.any(String),
          createdAt: expect.any(Number)
        }),
        expect.objectContaining({
          hash: expect.any(String),
          createdAt: expect.any(Number)
        })
      ]);
    } finally {
      store.close();
    }
  });

  test("returns a typed Drizzle database handle", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      await insertWorkspace(store.db);
      await insertSession(store.db);

      const rows = await store.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionKey, "agent:main:cli:local"));

      expect(rows).toEqual([
        expect.objectContaining({
          id: "session-1",
          runtimeProvider: "pi",
          status: "active"
        })
      ]);
    } finally {
      store.close();
    }
  });

  test("enforces key chat/gateway control-plane constraints", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      await insertWorkspace(store.db, {
        chatId: "12345",
        platform: "telegram",
        workspaceKey: "workspace:telegram:dm:12345:main"
      });
      await insertSession(store.db, {
        id: "session-1",
        sessionKey: "agent:main:telegram:dm:12345",
        source: "telegram"
      });

      expect(() =>
        store.sqlite
          .query(
            `
              INSERT INTO sessions (
                id,
                workspace_id,
                session_key,
                runtime_provider,
                source,
                status,
                created_at,
                updated_at
              )
              VALUES (
                'session-duplicate',
                'workspace-1',
                'agent:main:telegram:dm:12345',
                'pi',
                'telegram',
                'active',
                '2026-05-11T00:00:01.000Z',
                '2026-05-11T00:00:01.000Z'
              );
            `
          )
          .run()
      ).toThrow();

      store.sqlite.query("UPDATE sessions SET status = 'archived' WHERE id = 'session-1';").run();
      await insertSession(store.db, {
        id: "session-2",
        parentSessionId: "session-1",
        sessionKey: "agent:main:telegram:dm:12345",
        source: "telegram"
      });

      expect(() =>
        store.sqlite
          .query(
            `
              INSERT INTO sessions (
                id,
                workspace_id,
                session_key,
                runtime_provider,
                source,
                status,
                created_at,
                updated_at
              )
              VALUES (
                'session-invalid-workspace',
                'missing-workspace',
                'agent:main:telegram:dm:missing',
                'pi',
                'telegram',
                'active',
                '2026-05-11T00:00:02.000Z',
                '2026-05-11T00:00:02.000Z'
              );
            `
          )
          .run()
      ).toThrow();

      expect(() =>
        store.sqlite
          .query(
            `
              INSERT INTO session_entries (
                id,
                session_id,
                entry_type,
                role,
                message_type,
                created_at
              )
              VALUES (
                'entry-invalid',
                'session-2',
                'unknown',
                'user',
                'text',
                '2026-05-11T00:00:03.000Z'
              );
            `
          )
          .run()
      ).toThrow();

      await insertSession(store.db, {
        id: "session-3",
        sessionKey: "agent:main:cli:other"
      });
      await store.db.insert(sessionEntries).values({
        id: "entry-other-session",
        sessionId: "session-3",
        entryType: "message",
        role: "user",
        messageType: "text",
        text: "Other session",
        createdAt: "2026-05-11T00:00:05.000Z"
      });

      expect(() =>
        store.sqlite
          .query(
            `
              INSERT INTO session_entries (
                id,
                session_id,
                parent_entry_id,
                entry_type,
                role,
                message_type,
                text,
                created_at
              )
              VALUES (
                'entry-cross-session-child',
                'session-1',
                'entry-other-session',
                'message',
                'assistant',
                'text',
                'Should not attach across sessions',
                '2026-05-11T00:00:06.000Z'
              );
            `
          )
          .run()
      ).toThrow();

      expect(() =>
        store.sqlite
          .query(
            "UPDATE sessions SET active_leaf_entry_id = 'entry-other-session' WHERE id = 'session-1';"
          )
          .run()
      ).toThrow();
    } finally {
      store.close();
    }
  });

  test("stores session entries as a tree and tracks the active leaf", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      await insertWorkspace(store.db);
      await insertSession(store.db);

      await store.db.insert(sessionEntries).values([
        {
          id: "entry-root",
          sessionId: "session-1",
          runtimeEntryId: "pi-root",
          entryType: "message",
          role: "user",
          messageType: "text",
          text: "Try an approach",
          createdAt: "2026-05-11T00:00:01.000Z"
        },
        {
          id: "entry-approach-a",
          sessionId: "session-1",
          parentEntryId: "entry-root",
          runtimeEntryId: "pi-a",
          entryType: "message",
          role: "assistant",
          messageType: "text",
          text: "Approach A",
          createdAt: "2026-05-11T00:00:02.000Z"
        },
        {
          id: "entry-approach-b",
          sessionId: "session-1",
          parentEntryId: "entry-root",
          runtimeEntryId: "pi-b",
          entryType: "message",
          role: "assistant",
          messageType: "text",
          text: "Approach B",
          createdAt: "2026-05-11T00:00:03.000Z"
        }
      ]);

      await store.db
        .update(sessions)
        .set({ activeLeafEntryId: "entry-approach-b" })
        .where(eq(sessions.id, "session-1"));

      expect(listChildren(store.sqlite, "entry-root")).toEqual([
        "entry-approach-a",
        "entry-approach-b"
      ]);
      expect(listActiveBranch(store.sqlite, "session-1")).toEqual([
        "entry-root",
        "entry-approach-b"
      ]);

      expect(() =>
        store.sqlite
          .query(
            "UPDATE sessions SET active_leaf_entry_id = 'missing-entry' WHERE id = 'session-1';"
          )
          .run()
      ).toThrow();

      expect(() =>
        store.sqlite
          .query(
            `
              INSERT INTO session_entries (
                id,
                session_id,
                parent_entry_id,
                runtime_entry_id,
                entry_type,
                created_at
              )
              VALUES (
                'entry-duplicate-runtime',
                'session-1',
                'entry-root',
                'pi-b',
                'metadata',
                '2026-05-11T00:00:04.000Z'
              );
            `
          )
          .run()
      ).toThrow();
    } finally {
      store.close();
    }
  });

  test("keeps session entry FTS synchronized with entry writes", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      await insertWorkspace(store.db);
      await insertSession(store.db);

      await store.db.insert(sessionEntries).values({
        id: "entry-1",
        sessionId: "session-1",
        entryType: "message",
        role: "assistant",
        messageType: "text",
        text: "first response",
        createdAt: "2026-05-11T00:00:01.000Z"
      });

      expect(listFtsTexts(store.sqlite)).toEqual(["first response"]);

      store.sqlite
        .query("UPDATE session_entries SET text = 'updated response' WHERE id = 'entry-1';")
        .run();
      expect(listFtsTexts(store.sqlite)).toEqual(["updated response"]);

      store.sqlite.query("DELETE FROM session_entries WHERE id = 'entry-1';").run();
      expect(listFtsTexts(store.sqlite)).toEqual([]);
    } finally {
      store.close();
    }
  });

  test("fails clearly when migration metadata is missing", async () => {
    const missingFolder = join(await createTempDir(), "missing-drizzle");

    await expect(
      openSessionStore({
        databasePath: ":memory:",
        migrationsFolder: missingFolder
      })
    ).rejects.toThrow("Can't find meta/_journal.json file");
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "personal-agent-session-store-"));
  tempDirs.push(tempDir);
  return tempDir;
}

function readForeignKeyPragma(database: Database): number {
  const row = database.query<{ foreign_keys: number }, []>("PRAGMA foreign_keys;").get();
  return row?.foreign_keys ?? 0;
}

function listTables(database: Database): string[] {
  return database
    .query<{ name: string }, []>(
      `
        SELECT name
        FROM sqlite_master
        WHERE type IN ('table', 'virtual table')
        ORDER BY name ASC;
      `
    )
    .all()
    .map((row) => row.name);
}

function countRows(database: Database, tableName: string): number {
  const row = database
    .query<{ count: number }, []>(`SELECT COUNT(*) AS count FROM ${tableName};`)
    .get();
  return row?.count ?? 0;
}

function listChildren(database: Database, parentEntryId: string): string[] {
  return database
    .query<{ id: string }, [string]>(
      `
        SELECT id
        FROM session_entries
        WHERE parent_entry_id = ?
        ORDER BY created_at ASC;
      `
    )
    .all(parentEntryId)
    .map((row) => row.id);
}

function listActiveBranch(database: Database, sessionId: string): string[] {
  return database
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
    .all(sessionId)
    .map((row) => row.id);
}

function listFtsTexts(database: Database): string[] {
  return database
    .query<{ text: string }, []>("SELECT text FROM session_entries_fts ORDER BY entry_id ASC;")
    .all()
    .map((row) => row.text);
}

async function insertWorkspace(
  db: Awaited<ReturnType<typeof openSessionStore>>["db"],
  overrides: Partial<typeof workspaces.$inferInsert> = {}
): Promise<void> {
  await db.insert(workspaces).values({
    id: "workspace-1",
    workspaceKey: "workspace:cli:local:project:main",
    agentId: "main",
    rootPath: "/tmp/project",
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
    lastUsedAt: "2026-05-11T00:00:00.000Z",
    ...overrides
  });
}

async function insertSession(
  db: Awaited<ReturnType<typeof openSessionStore>>["db"],
  overrides: Partial<typeof sessions.$inferInsert> = {}
): Promise<void> {
  await db.insert(sessions).values({
    id: "session-1",
    workspaceId: "workspace-1",
    sessionKey: "agent:main:cli:local",
    runtimeProvider: "pi",
    source: "cli",
    status: "active",
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
    ...overrides
  });
}
