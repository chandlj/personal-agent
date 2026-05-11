import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "@personal-agent/config";
import { createAgentRuntime } from "./runtime.js";
import type {
  PromptRequest,
  PromptResult,
  RuntimeSession,
  RuntimeSessionFactory,
  RuntimeSessionFactoryCreateSessionInput
} from "./types.js";

describe("AgentRuntime", () => {
  test("disposes one-shot prompt sessions after successful prompts", async () => {
    const root = await mkdtemp(join(tmpdir(), "personal-agent-runtime-"));
    const session = new FakeRuntimeSession({
      result: {
        sessionId: "session-1",
        text: "done",
        events: []
      }
    });
    const sessionFactory = new FakeRuntimeSessionFactory(session);
    const runtime = createAgentRuntime({
      config: testConfig({
        globalRoot: join(root, "global"),
        workspaceRoot: join(root, "workspace")
      }),
      sessionFactory
    });

    const result = await runtime.runPrompt({
      prompt: "hello",
      includeWorkspaceResources: true,
      sessionKey: "cli",
      workspaceRoot: join(root, "project")
    });

    expect(result.text).toBe("done");
    expect(session.disposed).toBe(true);
    expect(session.requests).toEqual([
      {
        prompt: "hello",
        includeWorkspaceResources: true,
        sessionKey: "cli",
        workspaceRoot: join(root, "project")
      }
    ]);
    expect(sessionFactory.inputs).toHaveLength(1);
    expect(sessionFactory.inputs[0]?.sessionKey).toBe("cli");
    expect(sessionFactory.inputs[0]?.workspaceRoot).toBe(join(root, "project"));
    expect(sessionFactory.inputs[0]?.resources.roots.map((resource) => resource.kind)).toEqual([
      "global",
      "workspace"
    ]);
  });

  test("disposes one-shot prompt sessions after prompt failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "personal-agent-runtime-"));
    const session = new FakeRuntimeSession({
      error: new Error("provider failed")
    });
    const runtime = createAgentRuntime({
      config: testConfig({
        globalRoot: join(root, "global"),
        workspaceRoot: join(root, "workspace")
      }),
      sessionFactory: new FakeRuntimeSessionFactory(session)
    });

    await expect(runtime.runPrompt({ prompt: "hello" })).rejects.toThrow("provider failed");
    expect(session.disposed).toBe(true);
  });

  test("createSession leaves lifecycle ownership with the caller", async () => {
    const root = await mkdtemp(join(tmpdir(), "personal-agent-runtime-"));
    const session = new FakeRuntimeSession({
      result: {
        sessionId: "session-1",
        text: "done",
        events: []
      }
    });
    const runtime = createAgentRuntime({
      config: testConfig({
        globalRoot: join(root, "global"),
        workspaceRoot: join(root, "workspace")
      }),
      sessionFactory: new FakeRuntimeSessionFactory(session)
    });

    const created = await runtime.createSession();

    expect(created).toBe(session);
    expect(session.disposed).toBe(false);
    created.dispose();
    expect(session.disposed).toBe(true);
  });
});

class FakeRuntimeSessionFactory implements RuntimeSessionFactory {
  readonly inputs: RuntimeSessionFactoryCreateSessionInput[] = [];
  readonly #session: RuntimeSession;

  constructor(session: RuntimeSession) {
    this.#session = session;
  }

  async createSession(input: RuntimeSessionFactoryCreateSessionInput): Promise<RuntimeSession> {
    this.inputs.push(input);
    return this.#session;
  }
}

class FakeRuntimeSession implements RuntimeSession {
  readonly id = "session-1";
  readonly sessionKey = "local";
  readonly workspaceRoot = "/workspace";
  readonly requests: PromptRequest[] = [];
  readonly #result: PromptResult | undefined;
  readonly #error: Error | undefined;

  disposed = false;

  constructor(input: { result?: PromptResult; error?: Error }) {
    this.#result = input.result;
    this.#error = input.error;
  }

  async runPrompt(request: PromptRequest): Promise<PromptResult> {
    this.requests.push(request);

    if (this.#error !== undefined) {
      throw this.#error;
    }

    if (this.#result === undefined) {
      throw new Error("FakeRuntimeSession requires result or error");
    }

    return this.#result;
  }

  dispose(): void {
    this.disposed = true;
  }
}

function testConfig(input: { globalRoot: string; workspaceRoot: string }): AppConfig {
  return {
    runtime: {
      mode: "local",
      workspaceRoot: input.workspaceRoot,
      resources: {
        globalRoot: input.globalRoot,
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
      allowTailscaleUi: true
    },
    platforms: {
      telegram: {
        enabled: true,
        botTokenEnvVar: "TELEGRAM_BOT_TOKEN",
        allowedUsers: []
      }
    },
    sandbox: {
      dockerImage: "oven/bun:1.3.10-debian",
      dockerWorkspacePath: "/workspace"
    },
    scheduler: {
      tickIntervalMs: 60_000
    }
  };
}
