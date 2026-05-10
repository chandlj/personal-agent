import { homedir } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "./schema.js";

export function loadAppConfig(): AppConfig {
  return {
    runtime: {
      mode: "local",
      workspaceRoot: join(homedir(), ".personal-agent", "workspaces"),
      resources: {
        globalRoot: join(homedir(), ".personal-agent"),
        workspaceConfigDirName: ".personal-agent",
        allowCliWorkspaceOverrides: true,
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
