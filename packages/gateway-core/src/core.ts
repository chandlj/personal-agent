import type { UiAuthPolicy } from "@personal-agent/auth";
import type { AppConfig } from "@personal-agent/config";

export interface GatewayCore {
  kind: "gateway-core";
  config: AppConfig;
  auth: UiAuthPolicy;
}

export function createGatewayCore(input: { config: AppConfig; auth: UiAuthPolicy }): GatewayCore {
  return {
    kind: "gateway-core",
    config: input.config,
    auth: input.auth
  };
}
