import type { SandboxTarget } from "@personal-agent/sandbox";

export type ToolName = "bash" | "read" | "write" | "edit" | "memory";

export function routeTool(toolName: ToolName): SandboxTarget {
  switch (toolName) {
    case "memory":
      return "memory";
    case "bash":
    case "read":
    case "write":
    case "edit":
      return "docker";
    default:
      return "docker";
  }
}
