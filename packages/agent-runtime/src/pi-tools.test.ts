import { describe, expect, test } from "bun:test";
import { createRuntimeCommandTools } from "./pi-tools.js";
import type { CommandExecutor, ExecutionRequest, ExecutionResult } from "./execution/types.js";

describe("createRuntimeCommandTools", () => {
  test("overrides bash with the configured command executor", async () => {
    const executor = new FakeCommandExecutor({
      stdout: "hello\n",
      stderr: "",
      exitCode: 0,
      timedOut: false,
      cancelled: false
    });

    const [bashTool] = createRuntimeCommandTools({
      commandExecutor: executor,
      cwd: "/workspace"
    });
    const updates: unknown[] = [];

    const result = await bashTool?.execute(
      "tool-1",
      {
        command: "echo hello",
        timeout: 2
      },
      undefined,
      (update) => updates.push(update),
      minimalExtensionContext("/workspace")
    );

    expect(bashTool?.name).toBe("bash");
    expect(result?.content).toEqual([{ type: "text", text: "hello\n" }]);
    expect(executor.requests).toEqual([
      expect.objectContaining({
        command: "echo hello",
        cwd: "/workspace",
        timeoutMs: 2000,
        metadata: {
          toolName: "bash"
        }
      })
    ]);
    expect(updates.length).toBeGreaterThan(0);
  });

  test("surfaces non-zero bash exits through the Pi bash tool behavior", async () => {
    const executor = new FakeCommandExecutor({
      stdout: "",
      stderr: "nope\n",
      exitCode: 7,
      timedOut: false,
      cancelled: false
    });
    const [bashTool] = createRuntimeCommandTools({
      commandExecutor: executor,
      cwd: "/workspace"
    });

    await expect(
      bashTool?.execute(
        "tool-1",
        {
          command: "exit 7"
        },
        undefined,
        undefined,
        minimalExtensionContext("/workspace")
      )
    ).rejects.toThrow("Command exited with code 7");
  });

  test("maps backend timeout results to Pi timeout errors", async () => {
    const executor = new FakeCommandExecutor({
      stdout: "started\n",
      stderr: "",
      exitCode: 143,
      timedOut: true,
      cancelled: true
    });
    const [bashTool] = createRuntimeCommandTools({
      commandExecutor: executor,
      cwd: "/workspace"
    });

    await expect(
      bashTool?.execute(
        "tool-1",
        {
          command: "sleep 10",
          timeout: 1
        },
        undefined,
        undefined,
        minimalExtensionContext("/workspace")
      )
    ).rejects.toThrow("Command timed out after 1 seconds");
  });
});

class FakeCommandExecutor implements CommandExecutor {
  readonly backend = "docker";
  readonly requests: ExecutionRequest[] = [];
  readonly #result: Pick<
    ExecutionResult,
    "stdout" | "stderr" | "exitCode" | "timedOut" | "cancelled"
  >;

  constructor(
    result: Pick<ExecutionResult, "stdout" | "stderr" | "exitCode" | "timedOut" | "cancelled">
  ) {
    this.#result = result;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    this.requests.push(request);

    const metadata: ExecutionResult["metadata"] = {
      ...request.metadata,
      command: request.command
    };

    if (request.cwd !== undefined) {
      metadata.cwd = request.cwd;
    }

    return {
      backend: this.backend,
      ...this.#result,
      startedAt: "2026-05-29T00:00:00.000Z",
      finishedAt: "2026-05-29T00:00:01.000Z",
      durationMs: 1000,
      metadata
    };
  }
}

function minimalExtensionContext(
  cwd: string
): Parameters<NonNullable<ReturnType<typeof createRuntimeCommandTools>[number]>["execute"]>[4] {
  return {
    cwd
  } as Parameters<NonNullable<ReturnType<typeof createRuntimeCommandTools>[number]>["execute"]>[4];
}
