import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { openSessionStore } from "./db.js";
import { createSessionEntryRepository } from "./repositories.js";
import { sessions, workspaces } from "./schema.js";
import type { SessionEntryRecord } from "./types.js";

describe("SessionEntryRepository", () => {
  test("appends entries as a tree and lists deterministic children", async () => {
    const store = await seededStore();

    try {
      const repository = createSessionEntryRepository(store);

      await repository.append(testEntry({ id: "entry-root", text: "root" }));
      await repository.append(
        testEntry({
          id: "entry-a",
          parentEntryId: "entry-root",
          text: "approach a",
          createdAt: "2026-05-12T00:00:02.000Z"
        })
      );
      await repository.append(
        testEntry({
          id: "entry-b",
          parentEntryId: "entry-root",
          text: "approach b",
          createdAt: "2026-05-12T00:00:03.000Z"
        })
      );

      expect((await repository.listBySession("session-1")).map((entry) => entry.id)).toEqual([
        "entry-root",
        "entry-a",
        "entry-b"
      ]);
      expect(
        (await repository.getChildren("session-1", "entry-root")).map((entry) => entry.id)
      ).toEqual(["entry-a", "entry-b"]);
      expect((await repository.getChildren("session-1", null)).map((entry) => entry.id)).toEqual([
        "entry-root"
      ]);
    } finally {
      store.close();
    }
  });

  test("reconstructs and moves the active branch without deleting history", async () => {
    const store = await seededStore();

    try {
      const repository = createSessionEntryRepository(store, {
        now: () => "2026-05-12T00:01:00.000Z"
      });

      await repository.append(testEntry({ id: "entry-root", text: "root" }));
      await repository.append(
        testEntry({
          id: "entry-a",
          parentEntryId: "entry-root",
          createdAt: "2026-05-12T00:00:02.000Z"
        })
      );
      await repository.append(
        testEntry({
          id: "entry-b",
          parentEntryId: "entry-root",
          createdAt: "2026-05-12T00:00:03.000Z"
        })
      );

      expect(await repository.moveActiveLeaf("session-1", "entry-b")).toEqual(
        expect.objectContaining({
          activeLeafEntryId: "entry-b",
          updatedAt: "2026-05-12T00:01:00.000Z"
        })
      );
      expect((await repository.listActiveBranch("session-1")).map((entry) => entry.id)).toEqual([
        "entry-root",
        "entry-b"
      ]);
      expect(await repository.moveActiveLeaf("session-1", null)).toEqual(
        expect.objectContaining({
          activeLeafEntryId: null
        })
      );
      expect((await repository.listBySession("session-1")).map((entry) => entry.id)).toEqual([
        "entry-root",
        "entry-a",
        "entry-b"
      ]);
    } finally {
      store.close();
    }
  });

  test("searches synchronized FTS text and updates session message time", async () => {
    const store = await seededStore();

    try {
      const repository = createSessionEntryRepository(store, {
        now: () => "2026-05-12T00:02:00.000Z"
      });

      await repository.append(
        testEntry({
          id: "entry-1",
          text: "first response",
          createdAt: "2026-05-12T00:00:01.000Z"
        })
      );
      await repository.append(
        testEntry({
          id: "entry-2",
          text: "second unrelated response",
          createdAt: "2026-05-12T00:00:02.000Z"
        })
      );

      expect(
        (await repository.search("session-1", "first")).map((result) => result.entry.id)
      ).toEqual(["entry-1"]);
      expect(await currentLastMessageAt(store)).toBe("2026-05-12T00:00:02.000Z");

      store.sqlite
        .query("UPDATE session_entries SET text = 'updated response' WHERE id = 'entry-1';")
        .run();

      expect(
        (await repository.search("session-1", "first")).map((result) => result.entry.id)
      ).toEqual([]);
      expect(
        (await repository.search("session-1", "updated")).map((result) => result.entry.id)
      ).toEqual(["entry-1"]);
    } finally {
      store.close();
    }
  });
});

async function seededStore(): Promise<Awaited<ReturnType<typeof openSessionStore>>> {
  const store = await openSessionStore({ databasePath: ":memory:" });

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
  await store.db.insert(sessions).values({
    id: "session-1",
    workspaceId: "workspace-1",
    sessionKey: "agent:main:cli:local",
    runtimeProvider: "pi",
    source: "cli",
    status: "active",
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z"
  });

  return store;
}

function testEntry(overrides: Partial<SessionEntryRecord> = {}): SessionEntryRecord {
  return {
    id: "entry-1",
    sessionId: "session-1",
    parentEntryId: null,
    runtimeEntryId: null,
    entryType: "message",
    role: "assistant",
    messageType: "text",
    text: "response",
    payloadJson: null,
    runtimePayloadJson: null,
    createdAt: "2026-05-12T00:00:01.000Z",
    ...overrides
  };
}

async function currentLastMessageAt(
  store: Awaited<ReturnType<typeof openSessionStore>>
): Promise<string | null> {
  const row = await store.db
    .select({ lastMessageAt: sessions.lastMessageAt })
    .from(sessions)
    .where(eq(sessions.id, "session-1"))
    .get();

  return row?.lastMessageAt ?? null;
}
