import { loadAppConfig } from "@personal-agent/config";
import { createScheduler } from "@personal-agent/scheduler-core";

async function main(): Promise<void> {
  const config = loadAppConfig();
  const scheduler = createScheduler({ config });

  console.log("scheduler scaffold ready");
  console.log(`tick interval: ${scheduler.tickIntervalMs}ms`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});
