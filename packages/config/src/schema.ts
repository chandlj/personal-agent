export interface RuntimeConfig {
  mode: "local";
  workspaceRoot: string;
}

export interface AuthConfig {
  uiMode: "token" | "password" | "tailscale";
  apiMode: "token";
  allowTailscaleUi: boolean;
}

export interface TelegramPlatformConfig {
  enabled: boolean;
  botTokenEnvVar: string;
  allowedUsers: string[];
}

export interface PlatformConfig {
  telegram: TelegramPlatformConfig;
}

export interface SandboxConfig {
  dockerImage: string;
  dockerWorkspacePath: string;
}

export interface SchedulerConfig {
  tickIntervalMs: number;
}

export interface AppConfig {
  runtime: RuntimeConfig;
  auth: AuthConfig;
  platforms: PlatformConfig;
  sandbox: SandboxConfig;
  scheduler: SchedulerConfig;
}
