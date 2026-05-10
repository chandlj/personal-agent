import type { ExecutionRequest, ExecutionResult } from "./types.js";

export interface Executor {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

export function createDockerExecutor(): Executor {
  return {
    async execute(request) {
      return {
        target: "docker",
        stdout: `TODO docker execute: ${request.command}`,
        stderr: "",
        exitCode: 0
      };
    }
  };
}

export function createHostExecutor(): Executor {
  return {
    async execute(request) {
      return {
        target: "host",
        stdout: `TODO host execute: ${request.command}`,
        stderr: "",
        exitCode: 0
      };
    }
  };
}
