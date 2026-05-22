import { BunCommandRunner, commandRunnerOptions } from "./command-runner.js";
import { errorMessage, executionResult } from "./results.js";
import type {
  CommandExecutor,
  CommandRunner,
  ExecutionRequest,
  ExecutionResult,
  LocalExecutorOptions
} from "./types.js";

export function createLocalExecutor(options: LocalExecutorOptions = {}): CommandExecutor {
  return new LocalExecutor(
    options.runner ?? new BunCommandRunner(),
    options.allowArbitraryCommands === true
  );
}

class LocalExecutor implements CommandExecutor {
  readonly backend = "local";
  readonly #runner: CommandRunner;
  readonly #allowArbitraryCommands: boolean;

  constructor(runner: CommandRunner, allowArbitraryCommands: boolean) {
    this.#runner = runner;
    this.#allowArbitraryCommands = allowArbitraryCommands;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();

    if (!this.#allowArbitraryCommands) {
      return executionResult({
        request,
        startedAtMs,
        startedAt,
        backend: "local",
        stdout: "",
        stderr: "Local command execution is disabled",
        exitCode: 1,
        timedOut: false,
        cancelled: false,
        error: "Local command execution is disabled"
      });
    }

    try {
      const result = await this.#runner.run(
        "sh",
        ["-lc", request.command],
        commandRunnerOptions({
          cwd: request.cwd,
          env: request.env,
          signal: request.signal,
          timeoutMs: request.timeoutMs
        })
      );

      return executionResult({
        request,
        startedAtMs,
        startedAt,
        backend: "local",
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        timedOut: result.timedOut === true,
        cancelled: result.cancelled === true
      });
    } catch (error) {
      const message = errorMessage(error);
      return executionResult({
        request,
        startedAtMs,
        startedAt,
        backend: "local",
        stdout: "",
        stderr: message,
        exitCode: 1,
        timedOut: false,
        cancelled: false,
        error: message
      });
    }
  }
}
