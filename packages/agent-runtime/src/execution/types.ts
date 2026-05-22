export type ExecutionBackend = "docker" | "local";

export interface ExecutionRequest {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  metadata?: ExecutionRequestMetadata;
}

export interface ExecutionResult {
  backend: ExecutionBackend;
  stdout: string;
  stderr: string;
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  timedOut: boolean;
  cancelled: boolean;
  error?: string;
  metadata: ExecutionResultMetadata;
}

export interface ExecutionRequestMetadata {
  toolName?: string;
  sessionId?: string;
  workspaceId?: string;
  workspaceKey?: string;
  approvalId?: string;
}

export interface ExecutionResultMetadata extends ExecutionRequestMetadata {
  command: string;
  cwd?: string;
  containerName?: string;
}

export interface CommandExecutor {
  readonly backend: ExecutionBackend;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

export interface DockerBackendConfig {
  image: string;
  workspaceRoot: string;
  workspacePath: string;
  containerName?: string;
  workspaceId?: string;
  workspaceKey?: string;
  timeoutMs?: number;
  envAllowlist?: string[];
  binds?: DockerBindMount[];
  privileged?: boolean;
  networkMode?: string;
  securityOpt?: string[];
  capAdd?: string[];
}

export interface DockerBindMount {
  source: string;
  target: string;
  readonly?: boolean;
}

export interface DockerExecutorOptions {
  config: DockerBackendConfig;
  runner?: CommandRunner;
}

export interface LocalExecutorOptions {
  allowArbitraryCommands?: boolean;
  runner?: CommandRunner;
}

export interface CommandRunner {
  run(command: string, args: string[], options?: CommandRunnerOptions): Promise<CommandResult>;
}

export interface CommandRunnerOptions {
  cwd?: string | undefined;
  env?: Record<string, string> | undefined;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
}

export type CommandResult = Pick<ExecutionResult, "stdout" | "stderr" | "exitCode"> &
  Partial<Pick<ExecutionResult, "timedOut" | "cancelled">>;
