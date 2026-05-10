import type { AppConfig } from "@personal-agent/config";

export type RuntimeEvent =
  | RuntimeSessionEvent
  | RuntimeTurnEvent
  | RuntimeMessageEvent
  | RuntimeAssistantMessageEvent
  | RuntimeToolEvent
  | RuntimeQueueEvent
  | RuntimeCompactionEvent
  | RuntimeThinkingLevelChangedEvent
  | RuntimeSessionInfoChangedEvent
  | RuntimeRetryEvent
  | RuntimeErrorEvent;

export interface RuntimeEventBase {
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface RuntimeSessionEvent extends RuntimeEventBase {
  kind: "session_start" | "session_end";
}

export interface RuntimeTurnEvent extends RuntimeEventBase {
  kind: "turn_start" | "turn_end";
}

export interface RuntimeMessageEvent extends RuntimeEventBase {
  kind: "message_start" | "message_update" | "message_end";
  role?: string;
  text?: string;
}

export interface RuntimeAssistantMessageEvent extends RuntimeEventBase {
  kind: "assistant_message";
  text: string;
}

export type RuntimeToolEvent = RuntimeToolStartEvent | RuntimeToolUpdateEvent | RuntimeToolEndEvent;

export interface RuntimeToolStartEvent extends RuntimeEventBase {
  kind: "tool_start";
  toolCallId: string;
  toolName: string;
  args?: unknown;
}

export interface RuntimeToolUpdateEvent extends RuntimeEventBase {
  kind: "tool_update";
  toolCallId: string;
  toolName: string;
  partialResult?: unknown;
}

export interface RuntimeToolEndEvent extends RuntimeEventBase {
  kind: "tool_end";
  toolCallId: string;
  toolName: string;
  result?: unknown;
  isError: boolean;
}

export interface RuntimeQueueEvent extends RuntimeEventBase {
  kind: "queue_update";
  steering: readonly string[];
  followUp: readonly string[];
}

export type RuntimeCompactionEvent = RuntimeCompactionStartEvent | RuntimeCompactionEndEvent;

export interface RuntimeCompactionStartEvent extends RuntimeEventBase {
  kind: "compaction_start";
  reason: "manual" | "threshold" | "overflow";
}

export interface RuntimeCompactionEndEvent extends RuntimeEventBase {
  kind: "compaction_end";
  reason: "manual" | "threshold" | "overflow";
  aborted: boolean;
  willRetry: boolean;
  errorMessage?: string;
}

export interface RuntimeThinkingLevelChangedEvent extends RuntimeEventBase {
  kind: "thinking_level_changed";
  level: string;
}

export interface RuntimeSessionInfoChangedEvent extends RuntimeEventBase {
  kind: "session_info_changed";
  name?: string;
}

export type RuntimeRetryEvent = RuntimeRetryStartEvent | RuntimeRetryEndEvent;

export interface RuntimeRetryStartEvent extends RuntimeEventBase {
  kind: "retry_start";
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  errorMessage: string;
}

export interface RuntimeRetryEndEvent extends RuntimeEventBase {
  kind: "retry_end";
  success: boolean;
  attempt: number;
  finalError?: string;
}

export interface RuntimeErrorEvent extends RuntimeEventBase {
  kind: "error";
  message: string;
  fatal?: boolean;
}

export interface RuntimeResourcePaths {
  agentFile: string;
  systemFile: string;
  appendSystemFile: string;
  skillsDir: string;
  promptsDir: string;
  extensionsDir: string;
}

export type RuntimeCallerSource = "cli" | "telegram" | "scheduler";

export type RuntimeResourceRootKind = "global" | "workspace";

export interface RuntimeResourceRoot {
  kind: RuntimeResourceRootKind;
  root: string;
  paths: RuntimeResourcePaths;
}

export interface ResolvedRuntimeResources {
  roots: RuntimeResourceRoot[];
}

export interface CreateRuntimeSessionInput {
  source?: RuntimeCallerSource;
  sessionKey?: string;
  workspaceRoot?: string;
  resourcePaths?: Partial<RuntimeResourcePaths>;
}

export interface PromptRequest {
  prompt: string;
  source?: RuntimeCallerSource;
  sessionKey?: string;
  workspaceRoot?: string;
  metadata?: Record<string, unknown>;
}

export interface PromptResult {
  sessionId: string;
  text: string;
  events: RuntimeEvent[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeSession {
  id: string;
  sessionKey: string;
  workspaceRoot: string;
  runPrompt(request: PromptRequest): Promise<PromptResult>;
}

export interface AgentRuntime {
  readonly config: AppConfig;
  createSession(input?: CreateRuntimeSessionInput): Promise<RuntimeSession>;
  runPrompt(request: PromptRequest): Promise<PromptResult>;
}

export interface CreateAgentRuntimeInput {
  config: AppConfig;
}
