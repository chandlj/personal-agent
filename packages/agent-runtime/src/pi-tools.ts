import { createBashToolDefinition } from "@earendil-works/pi-coding-agent";
import type { BashOperations, ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { CommandExecutor, ExecutionRequest, ExecutionResult } from "./execution/types.js";

export function createRuntimeCommandTools(input: {
  commandExecutor: CommandExecutor;
  cwd: string;
}): ToolDefinition[] {
  return [
    createBashToolDefinition(input.cwd, {
      operations: createCommandExecutorBashOperations(input.commandExecutor)
    }) as unknown as ToolDefinition
  ];
}

function createCommandExecutorBashOperations(commandExecutor: CommandExecutor): BashOperations {
  return {
    async exec(command, cwd, options) {
      const request: ExecutionRequest = {
        command,
        cwd,
        metadata: {
          toolName: "bash"
        }
      };

      if (options.env !== undefined) {
        request.env = normalizeEnv(options.env);
      }

      if (options.signal !== undefined) {
        request.signal = options.signal;
      }

      if (options.timeout !== undefined) {
        request.timeoutMs = options.timeout * 1000;
      }

      const result = await commandExecutor.execute(request);

      emitCommandOutput(result, options.onData);

      if (result.timedOut) {
        throw new Error(`timeout:${options.timeout ?? Math.ceil(result.durationMs / 1000)}`);
      }

      if (options.signal?.aborted || result.cancelled) {
        throw new Error("aborted");
      }

      return {
        exitCode: result.exitCode
      };
    }
  };
}

function emitCommandOutput(result: ExecutionResult, onData: (data: Buffer) => void): void {
  if (result.stdout.length > 0) {
    onData(Buffer.from(result.stdout));
  }

  if (result.stderr.length > 0) {
    onData(Buffer.from(result.stderr));
  }
}

function normalizeEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}
