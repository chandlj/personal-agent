export type SandboxTarget = "docker" | "host" | "memory";

export interface ExecutionRequest {
  command: string;
  cwd?: string;
  target: SandboxTarget;
}

export interface ExecutionResult {
  target: SandboxTarget;
  stdout: string;
  stderr: string;
  exitCode: number;
}
