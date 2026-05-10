import { homedir } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "./schema.js";

export function loadAppConfig(): AppConfig {
  return {
    runtime: {
      mode: "local",
      workspaceRoot: join(homedir(), ".personal-agent", "workspaces")
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
