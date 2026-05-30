import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createDockerExecutor, createLocalExecutor, validateDockerConfig } from "./index.js";
import type {
  CommandRunner,
  CommandRunnerOptions,
  CommandResult,
  DockerBackendConfig
} from "./types.js";

describe("Docker backend executor", () => {
  test("starts one container per workspace and reuses it for foreground commands", async () => {
    const { executor, runner } = createDockerTestHarness([
      { stdout: "", stderr: "missing", exitCode: 1 },
      { stdout: "container-id\n", stderr: "", exitCode: 0 },
      { stdout: "first\n", stderr: "", exitCode: 0 },
      { stdout: "second\n", stderr: "", exitCode: 0 }
    ]);

    const first = await executor.execute({
      command: "pwd",
      cwd: join(testWorkspaceRoot, "src"),
      metadata: {
        toolName: "bash",
        sessionId: "session-1",
        workspaceId: "workspace-1"
      }
    });
    const second = await executor.execute({
      command: "echo second"
    });

    expect(first).toEqual(
      expect.objectContaining({
        backend: "docker",
        stdout: "first\n",
        stderr: "",
        exitCode: 0,
        timedOut: false,
        metadata: expect.objectContaining({
          command: "pwd",
          cwd: join(testWorkspaceRoot, "src"),
          toolName: "bash",
          sessionId: "session-1",
          workspaceId: "workspace-1",
          containerName: "personal-agent-test"
        })
      })
    );
    expect(second.stdout).toBe("second\n");
    expect(runner.calls).toHaveLength(4);
    expect(runner.calls[0]).toEqual({
      command: "docker",
      args: ["container", "inspect", "-f", "{{.State.Running}}", "personal-agent-test"],
      options: undefined
    });
    expect(runner.calls[1]?.args).toEqual([
      "run",
      "-d",
      "--name",
      "personal-agent-test",
      "--label",
      "personal-agent.owner=personal-agent",
      "--label",
      "personal-agent.workspace-root-hash=720c398e9a414c3b",
      "--workdir",
      "/workspace",
      "--mount",
      `type=bind,source=${testWorkspaceRoot},target=/workspace`,
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--pids-limit",
      "256",
      "--tmpfs",
      "/tmp:rw,nosuid,nodev,size=64m",
      "oven/bun:1.3.10-debian",
      "sleep",
      "infinity"
    ]);
    expect(runner.calls[2]).toEqual({
      command: "docker",
      args: ["exec", "-w", "/workspace/src", "personal-agent-test", "sh", "-lc", "pwd"],
      options: undefined
    });
    expect(runner.calls[3]?.args).toEqual([
      "exec",
      "-w",
      "/workspace",
      "personal-agent-test",
      "sh",
      "-lc",
      "echo second"
    ]);
  });

  test("uses an existing running container without starting another one", async () => {
    const { executor, runner } = createDockerTestHarness([
      { stdout: "true\n", stderr: "", exitCode: 0 },
      { stdout: "ok\n", stderr: "", exitCode: 0 }
    ]);

    const result = await executor.execute({
      command: "echo ok",
      timeoutMs: 1234
    });

    expect(result.stdout).toBe("ok\n");
    expect(runner.calls).toHaveLength(2);
    expect(runner.calls[1]?.options).toEqual({ timeoutMs: 1234 });
  });

  test("passes only allowlisted environment variables to docker exec", async () => {
    const { executor, runner } = createDockerTestHarness(
      [
        { stdout: "true\n", stderr: "", exitCode: 0 },
        { stdout: "ok\n", stderr: "", exitCode: 0 }
      ],
      {
        ...testDockerConfig(),
        envAllowlist: ["SAFE_ENV"]
      }
    );

    await executor.execute({
      command: "env",
      env: {
        SAFE_ENV: "1",
        LD_PRELOAD: "blocked"
      }
    });

    expect(runner.calls[1]?.args).toEqual([
      "exec",
      "-w",
      "/workspace",
      "--env",
      "SAFE_ENV=1",
      "personal-agent-test",
      "sh",
      "-lc",
      "env"
    ]);
  });

  test("clamps escaped container cwd values to the workspace path", async () => {
    const { executor, runner } = createDockerTestHarness([
      { stdout: "true\n", stderr: "", exitCode: 0 },
      { stdout: "ok\n", stderr: "", exitCode: 0 },
      { stdout: "ok\n", stderr: "", exitCode: 0 },
      { stdout: "ok\n", stderr: "", exitCode: 0 }
    ]);

    await executor.execute({
      command: "pwd",
      cwd: "../tmp"
    });
    await executor.execute({
      command: "pwd",
      cwd: "/workspace/../tmp"
    });
    await executor.execute({
      command: "pwd",
      cwd: "/workspace2"
    });

    expect(runner.calls[1]?.args).toEqual([
      "exec",
      "-w",
      "/workspace",
      "personal-agent-test",
      "sh",
      "-lc",
      "pwd"
    ]);
    expect(runner.calls[2]?.args).toEqual([
      "exec",
      "-w",
      "/workspace",
      "personal-agent-test",
      "sh",
      "-lc",
      "pwd"
    ]);
    expect(runner.calls[3]?.args).toEqual([
      "exec",
      "-w",
      "/workspace",
      "personal-agent-test",
      "sh",
      "-lc",
      "pwd"
    ]);
  });

  test("represents exec failures in the execution result", async () => {
    const { executor } = createDockerTestHarness([
      { stdout: "true\n", stderr: "", exitCode: 0 },
      { stdout: "", stderr: "command failed\n", exitCode: 42 }
    ]);

    const result = await executor.execute({
      command: "exit 42"
    });

    expect(result).toEqual(
      expect.objectContaining({
        backend: "docker",
        stdout: "",
        stderr: "command failed\n",
        exitCode: 42,
        timedOut: false,
        cancelled: false
      })
    );
  });

  test("represents timeout failures in the execution result", async () => {
    const { executor } = createDockerTestHarness([
      { stdout: "true\n", stderr: "", exitCode: 0 },
      { stdout: "", stderr: "", exitCode: 143, timedOut: true, cancelled: true }
    ]);

    const result = await executor.execute({
      command: "sleep 10",
      timeoutMs: 1
    });

    expect(result).toEqual(
      expect.objectContaining({
        exitCode: 143,
        timedOut: true,
        cancelled: true
      })
    );
  });

  test("labels containers with Personal Agent and workspace identity", async () => {
    const { executor, runner } = createDockerTestHarness(
      [
        { stdout: "", stderr: "missing", exitCode: 1 },
        { stdout: "container-id\n", stderr: "", exitCode: 0 },
        { stdout: "ok\n", stderr: "", exitCode: 0 }
      ],
      {
        ...testDockerConfig(),
        workspaceId: "workspace-1",
        workspaceKey: "workspace:cli:local"
      }
    );

    await executor.execute({
      command: "echo ok"
    });

    expect(runner.calls[1]?.args).toContain("personal-agent.owner=personal-agent");
    expect(runner.calls[1]?.args).toContain("personal-agent.workspace-root-hash=720c398e9a414c3b");
    expect(runner.calls[1]?.args).toContain("personal-agent.workspace-id=workspace-1");
    expect(runner.calls[1]?.args).toContain("personal-agent.workspace-key=workspace:cli:local");
  });

  test("starts an existing stopped container instead of recreating it", async () => {
    const { executor, runner } = createDockerTestHarness([
      { stdout: "false\n", stderr: "", exitCode: 0 },
      { stdout: "personal-agent-test\n", stderr: "", exitCode: 0 },
      { stdout: "ok\n", stderr: "", exitCode: 0 }
    ]);

    const result = await executor.execute({
      command: "echo ok"
    });

    expect(result.stdout).toBe("ok\n");
    expect(runner.calls[1]).toEqual({
      command: "docker",
      args: ["start", "personal-agent-test"],
      options: undefined
    });
  });

  test("validates dangerous Docker runtime configuration", () => {
    expect(() => validateDockerConfig(testDockerConfig())).not.toThrow();
    expect(() =>
      validateDockerConfig({
        ...testDockerConfig(),
        privileged: true
      })
    ).toThrow("privileged");
    expect(() =>
      validateDockerConfig({
        ...testDockerConfig(),
        networkMode: "host"
      })
    ).toThrow("host networking");
    expect(() =>
      validateDockerConfig({
        ...testDockerConfig(),
        securityOpt: ["seccomp=unconfined"]
      })
    ).toThrow("unconfined");
    expect(() =>
      validateDockerConfig({
        ...testDockerConfig(),
        binds: [{ source: "/var/run/docker.sock", target: "/docker.sock" }]
      })
    ).toThrow("Docker socket");
    expect(() =>
      validateDockerConfig({
        ...testDockerConfig(),
        binds: [{ source: "/", target: "/host-root" }]
      })
    ).toThrow("dangerous host path");
    expect(() =>
      validateDockerConfig({
        ...testDockerConfig(),
        binds: [{ source: "/etc/ssh", target: "/host-ssh" }]
      })
    ).toThrow("dangerous host path");
    expect(() =>
      validateDockerConfig({
        ...testDockerConfig(),
        binds: [{ source: "/tmp", target: "/workspace" }]
      })
    ).toThrow("reserved");
  });
});

describe("Local executor", () => {
  test("denies arbitrary local commands by default", async () => {
    const executor = createLocalExecutor();

    const result = await executor.execute({
      command: "open https://example.com"
    });

    expect(result).toEqual(
      expect.objectContaining({
        backend: "local",
        stdout: "",
        exitCode: 1,
        error: "Local command execution is disabled"
      })
    );
  });

  test("executes local commands when explicitly enabled", async () => {
    const runner = new FakeCommandRunner([
      {
        stdout: "sent\n",
        stderr: "",
        exitCode: 0
      }
    ]);
    const executor = createLocalExecutor({
      allowArbitraryCommands: true,
      runner
    });

    const result = await executor.execute({
      command: "notify",
      cwd: testWorkspaceRoot,
      env: {
        SAFE_ENV: "1"
      },
      timeoutMs: 100
    });

    expect(result).toEqual(
      expect.objectContaining({
        backend: "local",
        stdout: "sent\n",
        stderr: "",
        exitCode: 0
      })
    );
    expect(runner.calls[0]).toEqual({
      command: "sh",
      args: ["-lc", "notify"],
      options: {
        cwd: testWorkspaceRoot,
        env: {
          SAFE_ENV: "1"
        },
        timeoutMs: 100
      }
    });
  });
});

const testWorkspaceRoot = "/tmp/personal-agent-workspace";

function testDockerConfig(): DockerBackendConfig {
  return {
    image: "oven/bun:1.3.10-debian",
    workspaceRoot: testWorkspaceRoot,
    workspacePath: "/workspace",
    containerName: "personal-agent-test"
  };
}

function createDockerTestHarness(
  results: CommandResult[],
  config: DockerBackendConfig = testDockerConfig()
): {
  executor: ReturnType<typeof createDockerExecutor>;
  runner: FakeCommandRunner;
} {
  const runner = new FakeCommandRunner(results);
  const executor = createDockerExecutor({
    config,
    runner
  });

  return { executor, runner };
}

class FakeCommandRunner implements CommandRunner {
  readonly calls: {
    command: string;
    args: string[];
    options: CommandRunnerOptions | undefined;
  }[] = [];
  readonly #results: CommandResult[];

  constructor(results: CommandResult[]) {
    this.#results = results;
  }

  async run(
    command: string,
    args: string[],
    options?: CommandRunnerOptions
  ): Promise<CommandResult> {
    this.calls.push({ command, args, options });
    const result = this.#results.shift();

    if (result === undefined) {
      throw new Error("No fake command result configured");
    }

    return result;
  }
}
