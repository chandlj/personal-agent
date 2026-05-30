import type { AppConfig } from "@personal-agent/config";
import { createDockerExecutor } from "./docker-executor.js";
import { createLocalExecutor } from "./local-executor.js";
import type { CommandExecutor } from "./types.js";

export interface CreateCommandExecutorInput {
  config: AppConfig;
  workspaceRoot?: string;
}

export function createCommandExecutor(input: CreateCommandExecutorInput): CommandExecutor {
  const workspaceRoot = input.workspaceRoot ?? input.config.runtime.workspaceRoot;

  if (input.config.execution.backend === "local") {
    return createLocalExecutor({
      allowArbitraryCommands: input.config.execution.allowLocalCommands
    });
  }

  return createDockerExecutor({
    config: {
      image: input.config.execution.dockerImage,
      workspaceRoot,
      workspacePath: input.config.execution.dockerWorkspacePath
    }
  });
}
