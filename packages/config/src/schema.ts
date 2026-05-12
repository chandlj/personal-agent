export interface RuntimeConfig {
  mode: "local";
  workspaceRoot: string;
  resources: RuntimeResourceConfig;
}

export interface RuntimeResourceConfig {
  globalRoot: string;
  workspaceConfigDirName: string;
  allowWorkspaceOverrides: boolean;
  files: RuntimeResourceFilesConfig;
  directories: RuntimeResourceDirectoriesConfig;
}

export interface RuntimeResourceFilesConfig {
  agents: string;
  system: string;
  appendSystem: string;
}

export interface RuntimeResourceDirectoriesConfig {
  skills: string;
  prompts: string;
  extensions: string;
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

export interface StateConfig {
  databasePath: string;
}

export interface AppConfig {
  runtime: RuntimeConfig;
  auth: AuthConfig;
  platforms: PlatformConfig;
  sandbox: SandboxConfig;
  scheduler: SchedulerConfig;
  state: StateConfig;
}
