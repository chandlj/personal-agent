import { createAgentRuntime } from "@personal-agent/agent-runtime";
import { loadAppConfig } from "@personal-agent/config";
import { formatBanner } from "@personal-agent/shared";

async function main(): Promise<void> {
  const config = loadAppConfig();
  const runtime = createAgentRuntime({ config });

  console.log(formatBanner("personal-agent cli"));
  console.log(`mode: ${config.runtime.mode}`);
  console.log(`workspace: ${config.runtime.workspaceRoot}`);
  console.log(`runtime scaffold ready: ${runtime.config.runtime.mode}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});
