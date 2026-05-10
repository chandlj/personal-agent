import type { AuthConfig } from "@personal-agent/config";

export interface UiAuthPolicy {
  mode: AuthConfig["uiMode"];
  apiMode: AuthConfig["apiMode"];
  allowTailscaleUi: boolean;
}

export function createUiAuthPolicy(config: AuthConfig): UiAuthPolicy {
  return {
    mode: config.uiMode,
    apiMode: config.apiMode,
    allowTailscaleUi: config.allowTailscaleUi
  };
}
