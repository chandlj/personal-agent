import type {
  ExecutionBackend,
  ExecutionRequest,
  ExecutionResult,
  ExecutionResultMetadata
} from "./types.js";

export interface ExecutionResultInput {
  request: ExecutionRequest;
  startedAtMs: number;
  startedAt: string;
  backend: ExecutionBackend;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  cancelled: boolean;
  error?: string;
  containerName?: string;
}

export function executionResult(input: ExecutionResultInput): ExecutionResult {
  const finishedAtMs = Date.now();
  const metadata: ExecutionResultMetadata = {
    ...input.request.metadata,
    command: input.request.command
  };

  if (input.request.cwd !== undefined) {
    metadata.cwd = input.request.cwd;
  }

  if (input.containerName !== undefined) {
    metadata.containerName = input.containerName;
  }

  const result: ExecutionResult = {
    backend: input.backend,
    stdout: input.stdout,
    stderr: input.stderr,
    exitCode: input.exitCode,
    startedAt: input.startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - input.startedAtMs,
    timedOut: input.timedOut,
    cancelled: input.cancelled,
    metadata
  };

  if (input.error !== undefined) {
    result.error = input.error;
  }

  return result;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
