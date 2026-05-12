import { describe, expect, test } from "bun:test";
import { openSessionStore } from "./db.js";
import { createSessionRepository, SessionRepositoryError } from "./repositories.js";
import { sessionEntries, workspaces } from "./schema.js";
import type { SessionRecord } from "./types.js";

describe("SessionRepository", () => {
  test("creates sessions and looks up the active session by route key", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      await insertWorkspace(store);
      const repository = createSessionRepository(store);
      const session = testSession();

      await repository.create(session);

      expect(await repository.getById("session-1")).toEqual(session);
      expect(await repository.getActiveBySessionKey("agent:main:cli:local")).toEqual(session);
      expect(await repository.getActiveBySessionKey("missing")).toBeNull();
      expect(await repository.listByWorkspace("workspace-1")).toEqual([session]);
    } finally {
      store.close();
    }
  });

  test("rejects duplicate active sessions and missing parents", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      await insertWorkspace(store);
      const repository = createSessionRepository(store);

      await repository.create(testSession());

      await expect(
        repository.create(
          testSession({
            id: "session-duplicate"
          })
        )
      ).rejects.toMatchObject({
        code: "duplicate_active_session"
      });

      await expect(
        repository.create(
          testSession({
            id: "session-missing-parent",
            parentSessionId: "missing-session",
            sessionKey: "agent:main:cli:other"
          })
        )
      ).rejects.toMatchObject({
        code: "missing_parent_session"
      });
    } finally {
      store.close();
    }
  });

  test("archives, closes, and preserves session lineage", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      await insertWorkspace(store);
      const timestamps = ["2026-05-12T00:01:00.000Z", "2026-05-12T00:02:00.000Z"];
      const repository = createSessionRepository(store, {
        now: () => timestamps.shift() ?? "2026-05-12T00:03:00.000Z"
      });

      await repository.create(testSession());
      const archived = await repository.archive("session-1");
      await repository.create(
        testSession({
          id: "session-2",
          parentSessionId: "session-1"
        })
      );
      const closed = await repository.close("session-2");

      expect(archived).toEqual(
        expect.objectContaining({
          id: "session-1",
          status: "archived",
          updatedAt: "2026-05-12T00:01:00.000Z"
        })
      );
      expect(await repository.getById("session-1")).toEqual(
        expect.objectContaining({
          status: "archived"
        })
      );
      expect(await repository.getById("session-2")).toEqual(
        expect.objectContaining({
          parentSessionId: "session-1"
        })
      );
      expect(closed).toEqual(
        expect.objectContaining({
          id: "session-2",
          status: "closed",
          updatedAt: "2026-05-12T00:02:00.000Z"
        })
      );
    } finally {
      store.close();
    }
  });

  test("sets and clears the active leaf and updates last message time", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      await insertWorkspace(store);
      const timestamps = [
        "2026-05-12T00:01:00.000Z",
        "2026-05-12T00:02:00.000Z",
        "2026-05-12T00:03:00.000Z"
      ];
      const repository = createSessionRepository(store, {
        now: () => timestamps.shift() ?? "2026-05-12T00:04:00.000Z"
      });

      await repository.create(testSession());
      await store.db.insert(sessionEntries).values({
        id: "entry-1",
        sessionId: "session-1",
        entryType: "message",
        role: "assistant",
        messageType: "text",
        text: "hello",
        createdAt: "2026-05-12T00:00:30.000Z"
      });

      expect(await repository.setActiveLeaf("session-1", "entry-1")).toEqual(
        expect.objectContaining({
          activeLeafEntryId: "entry-1",
          updatedAt: "2026-05-12T00:01:00.000Z"
        })
      );
      expect(await repository.clearActiveLeaf("session-1")).toEqual(
        expect.objectContaining({
          activeLeafEntryId: null,
          updatedAt: "2026-05-12T00:02:00.000Z"
        })
      );
      expect(await repository.setLastMessageAt("session-1", "2026-05-12T00:00:30.000Z")).toEqual(
        expect.objectContaining({
          lastMessageAt: "2026-05-12T00:00:30.000Z",
          updatedAt: "2026-05-12T00:03:00.000Z"
        })
      );

      await expect(repository.setActiveLeaf("session-1", "missing")).rejects.toBeInstanceOf(
        SessionRepositoryError
      );
    } finally {
      store.close();
    }
  });
});

async function insertWorkspace(store: Awaited<ReturnType<typeof openSessionStore>>): Promise<void> {
  await store.db.insert(workspaces).values({
    id: "workspace-1",
    workspaceKey: "workspace:cli:local:/tmp/project:main",
    agentId: "main",
    platform: "cli",
    chatId: "/tmp/project",
    rootPath: "/tmp/project",
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
    lastUsedAt: "2026-05-12T00:00:00.000Z"
  });
}

function testSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "session-1",
    workspaceId: "workspace-1",
    sessionKey: "agent:main:cli:local",
    parentSessionId: null,
    runtimeProvider: "pi",
    runtimeSessionId: null,
    runtimeSessionPath: null,
    activeLeafEntryId: null,
    source: "cli",
    title: null,
    status: "active",
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
    lastMessageAt: null,
    ...overrides
  };
}
