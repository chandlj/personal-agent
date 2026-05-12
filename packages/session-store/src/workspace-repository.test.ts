import { describe, expect, test } from "bun:test";
import { openSessionStore } from "./db.js";
import { createWorkspaceRepository, resolveWorkspace } from "./repositories.js";

describe("WorkspaceRepository", () => {
  test("creates and reads workspaces by id and workspace key", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      const repository = createWorkspaceRepository(store, {
        workspaceRoot: "/tmp/personal-agent/workspaces"
      });
      const workspace = {
        id: "workspace-1",
        workspaceKey: "workspace:telegram:dm:12345:main",
        agentId: "main",
        platform: "telegram",
        chatId: "12345",
        threadId: null,
        parentWorkspaceId: null,
        rootPath: "/tmp/personal-agent/workspaces/telegram/12345/agents/main",
        createdAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        lastUsedAt: "2026-05-12T00:00:00.000Z"
      } as const;

      await repository.create(workspace);

      expect(await repository.getById("workspace-1")).toEqual(workspace);
      expect(await repository.getByWorkspaceKey("workspace:telegram:dm:12345:main")).toEqual(
        workspace
      );
      expect(await repository.getById("missing")).toBeNull();
      expect(await repository.getByWorkspaceKey("missing")).toBeNull();
    } finally {
      store.close();
    }
  });

  test("resolves Telegram DM and group workspaces deterministically", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      const timestamps = [
        "2026-05-12T00:00:00.000Z",
        "2026-05-12T00:01:00.000Z",
        "2026-05-12T00:02:00.000Z"
      ];
      const repository = createWorkspaceRepository(store, {
        idFactory: nextId("workspace"),
        now: () => timestamps.shift() ?? "2026-05-12T00:03:00.000Z",
        workspaceRoot: "/tmp/personal-agent/workspaces"
      });

      const dm = await repository.resolveOrCreate({
        source: "telegram",
        scope: "dm",
        chatId: "12345",
        agentId: "main"
      });
      const reused = await repository.resolveOrCreate({
        source: "telegram",
        scope: "dm",
        chatId: "12345",
        agentId: "main"
      });
      const group = await repository.resolveOrCreate({
        source: "telegram",
        scope: "group",
        chatId: "-10012345",
        agentId: "main"
      });

      expect(dm).toEqual(
        expect.objectContaining({
          id: "workspace-1",
          workspaceKey: "workspace:telegram:dm:12345:main",
          platform: "telegram",
          chatId: "12345",
          rootPath: "/tmp/personal-agent/workspaces/telegram/12345/agents/main",
          lastUsedAt: "2026-05-12T00:00:00.000Z"
        })
      );
      expect(reused).toEqual({
        ...dm,
        updatedAt: "2026-05-12T00:01:00.000Z",
        lastUsedAt: "2026-05-12T00:01:00.000Z"
      });
      expect(group).toEqual(
        expect.objectContaining({
          id: "workspace-2",
          workspaceKey: "workspace:telegram:group:-10012345:main",
          rootPath: "/tmp/personal-agent/workspaces/telegram/-10012345/agents/main"
        })
      );
    } finally {
      store.close();
    }
  });

  test("resolves CLI workspaces to the provided cwd", async () => {
    const store = await openSessionStore({ databasePath: ":memory:" });

    try {
      const repository = createWorkspaceRepository(store, {
        idFactory: nextId("workspace"),
        now: () => "2026-05-12T00:00:00.000Z",
        workspaceRoot: "/tmp/personal-agent/workspaces"
      });

      const workspace = await repository.resolveOrCreate({
        source: "cli",
        scope: "local",
        agentId: "main",
        cwd: "/tmp/project"
      });

      expect(workspace).toEqual(
        expect.objectContaining({
          id: "workspace-1",
          workspaceKey: "workspace:cli:local:/tmp/project:main",
          platform: "cli",
          chatId: "/tmp/project",
          rootPath: "/tmp/project"
        })
      );
    } finally {
      store.close();
    }
  });

  test("rejects incomplete resolve inputs", () => {
    expect(() =>
      resolveWorkspace("/tmp/workspaces", {
        source: "telegram",
        scope: "dm",
        agentId: "main"
      })
    ).toThrow("telegram workspace resolution requires chatId");

    expect(() =>
      resolveWorkspace("/tmp/workspaces", {
        source: "cli",
        scope: "local",
        agentId: "main"
      })
    ).toThrow("CLI workspace resolution requires cwd");
  });
});

function nextId(prefix: string): () => string {
  let next = 1;

  return () => `${prefix}-${next++}`;
}
