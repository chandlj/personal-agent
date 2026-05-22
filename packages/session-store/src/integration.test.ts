import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openSessionStore } from "./db.js";
import {
  createSessionEntryRepository,
  createSessionRepository,
  createWorkspaceRepository
} from "./repositories.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const tempDir of tempDirs.splice(0)) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("session-store integration", () => {
  test("persists workspace, session, and entry flow in a temporary SQLite database", async () => {
    const tempDir = await createTempDir();
    const databasePath = join(tempDir, "state", "state.db");
    const store = await openSessionStore({ databasePath });

    try {
      const workspaces = createWorkspaceRepository(store, {
        idFactory: () => "workspace-1",
        now: () => "2026-05-12T00:00:00.000Z",
        workspaceRoot: join(tempDir, "workspaces")
      });
      const sessions = createSessionRepository(store, {
        now: () => "2026-05-12T00:01:00.000Z"
      });
      const entries = createSessionEntryRepository(store, {
        now: () => "2026-05-12T00:02:00.000Z"
      });

      const workspace = await workspaces.resolveOrCreate({
        source: "telegram",
        scope: "dm",
        chatId: "12345",
        agentId: "main"
      });

      await sessions.create({
        id: "session-1",
        workspaceId: workspace.id,
        sessionKey: "agent:main:telegram:dm:12345",
        parentSessionId: null,
        runtimeProvider: "pi",
        runtimeSessionId: "pi-session-1",
        runtimeSessionPath: null,
        activeLeafEntryId: null,
        source: "telegram",
        title: "Telegram DM 12345",
        status: "active",
        createdAt: "2026-05-12T00:00:30.000Z",
        updatedAt: "2026-05-12T00:00:30.000Z",
        lastMessageAt: null
      });
      await entries.append({
        id: "entry-user",
        sessionId: "session-1",
        parentEntryId: null,
        runtimeEntryId: "runtime-entry-user",
        entryType: "message",
        role: "user",
        messageType: "text",
        text: "please summarize the current control plane",
        payloadJson: { platform: "telegram" },
        runtimePayloadJson: null,
        createdAt: "2026-05-12T00:00:31.000Z"
      });
      await entries.append({
        id: "entry-assistant",
        sessionId: "session-1",
        parentEntryId: "entry-user",
        runtimeEntryId: "runtime-entry-assistant",
        entryType: "message",
        role: "assistant",
        messageType: "text",
        text: "the M2 control plane stores workspaces sessions and session entries",
        payloadJson: null,
        runtimePayloadJson: { provider: "pi" },
        createdAt: "2026-05-12T00:00:32.000Z"
      });

      await entries.moveActiveLeaf("session-1", "entry-assistant");

      expect(await workspaces.getByWorkspaceKey("workspace:telegram:dm:12345:main")).toEqual(
        expect.objectContaining({
          id: "workspace-1",
          rootPath: join(tempDir, "workspaces", "telegram", "12345", "agents", "main")
        })
      );
      expect(await sessions.getActiveBySessionKey("agent:main:telegram:dm:12345")).toEqual(
        expect.objectContaining({
          id: "session-1",
          activeLeafEntryId: "entry-assistant",
          lastMessageAt: "2026-05-12T00:00:32.000Z"
        })
      );
      expect((await entries.listActiveBranch("session-1")).map((entry) => entry.id)).toEqual([
        "entry-user",
        "entry-assistant"
      ]);
      expect(
        (await entries.search("session-1", "stores")).map((result) => result.entry.id)
      ).toEqual(["entry-assistant"]);
    } finally {
      store.close();
    }
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "personal-agent-session-store-integration-"));
  tempDirs.push(tempDir);
  return tempDir;
}
