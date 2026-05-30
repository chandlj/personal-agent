import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { UiAuthPolicy } from "@personal-agent/auth";
import type {
  AgentRuntime,
  CreateRuntimeSessionInput,
  PromptRequest,
  PromptResult,
  RuntimeSession
} from "@personal-agent/agent-runtime";
import type { AppConfig } from "@personal-agent/config";
import { openSessionStore } from "@personal-agent/session-store";
import { describe, expect, test } from "bun:test";
import {
  buildGatewayRouteKey,
  createGatewayCore,
  inferGatewayRouteScope,
  resolveGatewayRoute,
  type GatewayDelivery
} from "./index.js";
import type { GatewayHandledInboundEvent, GatewayOutboundMessage } from "./types.js";

describe("gateway routing", () => {
  test("builds deterministic route keys", () => {
    expect(
      buildGatewayRouteKey({
        agentId: "main",
        platform: "telegram",
        scope: "dm",
        chatId: "12345"
      })
    ).toBe("agent:main:telegram:dm:12345");
    expect(
      buildGatewayRouteKey({
        agentId: "main",
        platform: "telegram",
        scope: "group",
        chatId: "-10012345"
      })
    ).toBe("agent:main:telegram:group:-10012345");
    expect(
      buildGatewayRouteKey({
        agentId: "main",
        platform: "discord",
        scope: "thread",
        chatId: "998",
        threadId: "42"
      })
    ).toBe("agent:main:discord:thread:998:42");
  });

  test("infers Telegram DM and group scopes without Telegram-native types", () => {
    expect(inferGatewayRouteScope(testEvent({ chatId: "12345" }))).toBe("dm");
    expect(inferGatewayRouteScope(testEvent({ chatId: "-10012345" }))).toBe("group");
    expect(resolveGatewayRoute(testEvent({ chatId: "12345" })).sessionKey).toBe(
      "agent:main:telegram:dm:12345"
    );
  });
});

describe("GatewayCore", () => {
  test("persists Telegram DM workspaces, sessions, entries, and delivery output", async () => {
    await withStore(async ({ store, root }) => {
      const runtime = new FakeRuntime();
      const delivery = new FakeDelivery();
      const core = createGatewayCore({
        config: testConfig(root, store.path),
        auth: testAuth(),
        runtime,
        delivery,
        store,
        idFactory: sequentialIdFactory(),
        now: sequentialClock("2026-05-30T12:00:00.000Z")
      });

      const result = await core.handleInboundEvent(
        testEvent({
          chatId: "12345",
          userId: "user-1",
          messageId: "message-1",
          text: "hello"
        })
      );

      expect(result.route.sessionKey).toBe("agent:main:telegram:dm:12345");
      expect(result.workspaceId).toBe("workspace-1");
      expect(result.sessionId).toBe("session-2");
      expect(runtime.requests.map((request) => request.prompt)).toEqual(["hello"]);
      expect(runtime.requests[0]?.sessionKey).toBe("agent:main:telegram:dm:12345");
      expect(runtime.requests[0]?.workspaceRoot).toBe(
        join(root, "telegram", "12345", "agents", "main")
      );
      expect(delivery.messages).toEqual([
        {
          platform: "telegram",
          targetChatId: "12345",
          text: "reply 1: hello",
          replyToMessageId: "message-1",
          deliveryMode: "final"
        }
      ]);

      const workspaces = await store.sqlite
        .query("SELECT workspace_key, platform, chat_id FROM workspaces ORDER BY id;")
        .all();
      expect(workspaces).toEqual([
        {
          workspace_key: "workspace:telegram:dm:12345:main",
          platform: "telegram",
          chat_id: "12345"
        }
      ]);

      const sessions = await store.sqlite
        .query(
          "SELECT session_key, workspace_id, source, status, active_leaf_entry_id FROM sessions;"
        )
        .all();
      expect(sessions).toEqual([
        {
          session_key: "agent:main:telegram:dm:12345",
          workspace_id: "workspace-1",
          source: "telegram",
          status: "active",
          active_leaf_entry_id: "session-entry-4"
        }
      ]);

      const entries = await store.sqlite
        .query("SELECT id, parent_entry_id, role, text FROM session_entries ORDER BY id;")
        .all();
      expect(entries).toEqual([
        {
          id: "session-entry-3",
          parent_entry_id: null,
          role: "user",
          text: "hello"
        },
        {
          id: "session-entry-4",
          parent_entry_id: "session-entry-3",
          role: "assistant",
          text: "reply 1: hello"
        }
      ]);
    });
  });

  test("maps Telegram group events to group workspace and session records", async () => {
    await withStore(async ({ store, root }) => {
      const core = createGatewayCore({
        config: testConfig(root, store.path),
        auth: testAuth(),
        runtime: new FakeRuntime(),
        delivery: new FakeDelivery(),
        store,
        idFactory: sequentialIdFactory(),
        now: sequentialClock("2026-05-30T12:00:00.000Z")
      });

      await core.handleInboundEvent(
        testEvent({
          chatId: "-10012345",
          userId: "user-1",
          messageId: "message-1",
          text: "group hello"
        })
      );

      expect(await store.sqlite.query("SELECT workspace_key FROM workspaces;").get()).toEqual({
        workspace_key: "workspace:telegram:group:-10012345:main"
      });
      expect(await store.sqlite.query("SELECT session_key FROM sessions;").get()).toEqual({
        session_key: "agent:main:telegram:group:-10012345"
      });
    });
  });

  test("runs messages for the same session through a FIFO queue", async () => {
    await withStore(async ({ store, root }) => {
      const runtime = new DeferredRuntime();
      const delivery = new FakeDelivery();
      const core = createGatewayCore({
        config: testConfig(root, store.path),
        auth: testAuth(),
        runtime,
        delivery,
        store,
        idFactory: sequentialIdFactory(),
        now: sequentialClock("2026-05-30T12:00:00.000Z")
      });

      const first = core.handleInboundEvent(testEvent({ messageId: "message-1", text: "first" }));
      const second = core.handleInboundEvent(testEvent({ messageId: "message-2", text: "second" }));

      await runtime.waitForRequestCount(1);
      expect(runtime.requests.map((request) => request.prompt)).toEqual(["first"]);
      runtime.resolveNext("first reply");
      await runtime.waitForRequestCount(2);
      expect(runtime.requests.map((request) => request.prompt)).toEqual(["first", "second"]);
      runtime.resolveNext("second reply");

      await Promise.all([first, second]);

      expect(delivery.messages.map((message) => message.text)).toEqual([
        "first reply",
        "second reply"
      ]);
      expect(
        await store.sqlite.query("SELECT role, text FROM session_entries ORDER BY rowid;").all()
      ).toEqual([
        { role: "user", text: "first" },
        { role: "assistant", text: "first reply" },
        { role: "user", text: "second" },
        { role: "assistant", text: "second reply" }
      ]);
    });
  });

  test("keeps the user entry active when the runtime fails", async () => {
    await withStore(async ({ store, root }) => {
      const core = createGatewayCore({
        config: testConfig(root, store.path),
        auth: testAuth(),
        runtime: new FailingRuntime("runtime unavailable"),
        delivery: new FakeDelivery(),
        store,
        idFactory: sequentialIdFactory(),
        now: sequentialClock("2026-05-30T12:00:00.000Z")
      });

      await expect(core.handleInboundEvent(testEvent({ text: "will fail" }))).rejects.toThrow(
        "runtime unavailable"
      );

      expect(
        await store.sqlite
          .query("SELECT active_leaf_entry_id AS activeLeafEntryId FROM sessions;")
          .get()
      ).toEqual({
        activeLeafEntryId: "session-entry-3"
      });
      expect(
        await store.sqlite
          .query("SELECT entry_type, role, text FROM session_entries ORDER BY rowid;")
          .all()
      ).toEqual([
        {
          entry_type: "message",
          role: "user",
          text: "will fail"
        }
      ]);
    });
  });

  test("records delivery failure without advancing the active leaf to the assistant entry", async () => {
    await withStore(async ({ store, root }) => {
      const core = createGatewayCore({
        config: testConfig(root, store.path),
        auth: testAuth(),
        runtime: new FakeRuntime(),
        delivery: new FailingDelivery("telegram send failed"),
        store,
        idFactory: sequentialIdFactory(),
        now: sequentialClock("2026-05-30T12:00:00.000Z")
      });

      await expect(core.handleInboundEvent(testEvent({ text: "deliver me" }))).rejects.toThrow(
        "telegram send failed"
      );

      expect(
        await store.sqlite
          .query("SELECT active_leaf_entry_id AS activeLeafEntryId FROM sessions;")
          .get()
      ).toEqual({
        activeLeafEntryId: "session-entry-3"
      });
      expect(
        await store.sqlite
          .query(
            "SELECT id, parent_entry_id, entry_type, role, text FROM session_entries ORDER BY rowid;"
          )
          .all()
      ).toEqual([
        {
          id: "session-entry-3",
          parent_entry_id: null,
          entry_type: "message",
          role: "user",
          text: "deliver me"
        },
        {
          id: "session-entry-4",
          parent_entry_id: "session-entry-3",
          entry_type: "message",
          role: "assistant",
          text: "reply 1: deliver me"
        },
        {
          id: "session-entry-5",
          parent_entry_id: "session-entry-3",
          entry_type: "state_change",
          role: null,
          text: "Gateway delivery failed"
        }
      ]);
    });
  });
});

class FakeRuntime implements AgentRuntime {
  readonly config = testConfig("/tmp/workspaces", ":memory:");
  readonly requests: PromptRequest[] = [];

  async createSession(_input?: CreateRuntimeSessionInput): Promise<RuntimeSession> {
    throw new Error("FakeRuntime does not create sessions");
  }

  async runPrompt(request: PromptRequest): Promise<PromptResult> {
    this.requests.push(request);

    return {
      sessionId: `runtime-session-${this.requests.length}`,
      text: `reply ${this.requests.length}: ${request.prompt}`,
      events: [],
      metadata: {
        entryId: `runtime-entry-${this.requests.length}`
      }
    };
  }
}

class DeferredRuntime implements AgentRuntime {
  readonly config = testConfig("/tmp/workspaces", ":memory:");
  readonly requests: PromptRequest[] = [];
  readonly #pending: Array<(result: PromptResult) => void> = [];
  #waiter: (() => void) | null = null;

  async createSession(_input?: CreateRuntimeSessionInput): Promise<RuntimeSession> {
    throw new Error("DeferredRuntime does not create sessions");
  }

  async runPrompt(request: PromptRequest): Promise<PromptResult> {
    this.requests.push(request);
    this.#waiter?.();
    this.#waiter = null;

    return await new Promise((resolve) => {
      this.#pending.push(resolve);
    });
  }

  resolveNext(text: string): void {
    const resolve = this.#pending.shift();

    if (resolve === undefined) {
      throw new Error("No deferred runtime request is pending");
    }

    resolve({
      sessionId: `runtime-session-${this.requests.length}`,
      text,
      events: []
    });
  }

  async waitForRequestCount(count: number): Promise<void> {
    if (this.requests.length >= count) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.#waiter = resolve;
    });
  }
}

class FailingRuntime implements AgentRuntime {
  readonly config = testConfig("/tmp/workspaces", ":memory:");

  constructor(readonly message: string) {}

  async createSession(_input?: CreateRuntimeSessionInput): Promise<RuntimeSession> {
    throw new Error("FailingRuntime does not create sessions");
  }

  async runPrompt(_request: PromptRequest): Promise<PromptResult> {
    throw new Error(this.message);
  }
}

class FakeDelivery implements GatewayDelivery {
  readonly messages: GatewayOutboundMessage[] = [];

  async deliver(message: GatewayOutboundMessage): Promise<void> {
    this.messages.push(message);
  }
}

class FailingDelivery implements GatewayDelivery {
  constructor(readonly message: string) {}

  async deliver(_message: GatewayOutboundMessage): Promise<void> {
    throw new Error(this.message);
  }
}

function testEvent(
  overrides: Partial<GatewayHandledInboundEvent> = {}
): GatewayHandledInboundEvent {
  return {
    platform: "telegram",
    chatId: "12345",
    userId: "user-1",
    messageId: "message-1",
    text: "hello",
    attachments: [],
    timestamp: "2026-05-30T12:00:00.000Z",
    raw: {},
    ...overrides
  };
}

async function withStore(
  callback: (input: {
    store: Awaited<ReturnType<typeof openSessionStore>>;
    root: string;
  }) => Promise<void>
): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), "gateway-core-"));
  const databasePath = join(tempDir, "state.sqlite");
  const store = await openSessionStore({ databasePath });

  try {
    await callback({ store, root: join(tempDir, "workspaces") });
  } finally {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  }
}

function sequentialIdFactory(): (prefix: string) => string {
  let next = 1;

  return (prefix: string) => `${prefix}-${next++}`;
}

function sequentialClock(start: string): () => string {
  let timestamp = Date.parse(start);

  return () => {
    const value = new Date(timestamp).toISOString();
    timestamp += 1000;

    return value;
  };
}

function testAuth(): UiAuthPolicy {
  return {
    mode: "token",
    apiMode: "token",
    allowTailscaleUi: false
  };
}

function testConfig(workspaceRoot: string, databasePath: string): AppConfig {
  return {
    runtime: {
      mode: "local",
      workspaceRoot,
      resources: {
        globalRoot: join(workspaceRoot, "global"),
        workspaceConfigDirName: ".personal-agent",
        allowWorkspaceOverrides: true,
        files: {
          agents: "AGENTS.md",
          system: "SYSTEM.md",
          appendSystem: "APPEND_SYSTEM.md"
        },
        directories: {
          skills: "skills",
          prompts: "prompts",
          extensions: "extensions"
        }
      }
    },
    auth: {
      uiMode: "token",
      apiMode: "token",
      allowTailscaleUi: false
    },
    platforms: {
      telegram: {
        enabled: true,
        botTokenEnvVar: "TELEGRAM_BOT_TOKEN",
        allowedUsers: []
      }
    },
    execution: {
      backend: "local",
      dockerImage: "personal-agent:latest",
      dockerWorkspacePath: "/workspace",
      allowLocalCommands: true
    },
    scheduler: {
      tickIntervalMs: 1000
    },
    state: {
      databasePath
    }
  };
}
