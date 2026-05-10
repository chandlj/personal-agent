import type { AppConfig } from "@personal-agent/config";

export interface AgentRuntime {
  kind: "agent-runtime";
  config: AppConfig;
}

export function createAgentRuntime(input: { config: AppConfig }): AgentRuntime {
  return {
    kind: "agent-runtime",
    config: input.config
  };
}
