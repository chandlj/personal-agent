import type { AppConfig } from "@personal-agent/config";
import type { GatewayCore } from "@personal-agent/gateway-core";

export interface TelegramAdapter {
  name: "telegram";
  core: GatewayCore;
  enabled: boolean;
}

export function createTelegramAdapter(input: {
  config: AppConfig;
  core: GatewayCore;
}): TelegramAdapter {
  return {
    name: "telegram",
    core: input.core,
    enabled: input.config.platforms.telegram.enabled
  };
}
