import { createUiAuthPolicy } from "@personal-agent/auth";
import { loadAppConfig } from "@personal-agent/config";
import { createTelegramAdapter } from "@personal-agent/gateway-adapter-telegram";
import { createGatewayCore } from "@personal-agent/gateway-core";

async function main(): Promise<void> {
  const config = loadAppConfig();
  const auth = createUiAuthPolicy(config.auth);
  const core = createGatewayCore({ config, auth });
  const telegram = createTelegramAdapter({ config, core });

  console.log("gateway scaffold ready");
  console.log(`auth mode: ${auth.mode}`);
  console.log(`telegram enabled: ${config.platforms.telegram.enabled}`);
  console.log(`adapter: ${telegram.name}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});
