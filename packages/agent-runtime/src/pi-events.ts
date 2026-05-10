import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { RuntimeEvent } from "./types.js";

export interface NormalizedPiEvent {
  event: RuntimeEvent;
  textDelta?: string;
  finalAssistantText?: string;
}

export function normalizePiEvent(event: AgentSessionEvent): NormalizedPiEvent | undefined {
  const timestamp = new Date();

  switch (event.type) {
    case "agent_start":
      return withEvent({
        kind: "session_start",
        timestamp,
        metadata: piMetadata(event)
      });
    case "agent_end":
      return withEvent({
        kind: "session_end",
        timestamp,
        metadata: piMetadata(event)
      });
    case "turn_start":
      return withEvent({
        kind: "turn_start",
        timestamp,
        metadata: piMetadata(event)
      });
    case "turn_end":
      return withEvent({
        kind: "turn_end",
        timestamp,
        metadata: piMetadata(event)
      });
    case "message_start":
      return withEvent(
        messageEvent({
          kind: "message_start",
          message: event.message,
          timestamp,
          metadata: piMetadata(event)
        })
      );
    case "message_update":
      return normalizeMessageUpdate(event, timestamp);
    case "message_end":
      return normalizeMessageEnd(event, timestamp);
    case "tool_execution_start":
      return withEvent({
        kind: "tool_start",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args,
        timestamp,
        metadata: piMetadata(event)
      });
    case "tool_execution_update":
      return withEvent({
        kind: "tool_update",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        partialResult: event.partialResult,
        timestamp,
        metadata: piMetadata(event)
      });
    case "tool_execution_end":
      return withEvent({
        kind: "tool_end",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        result: event.result,
        isError: event.isError,
        timestamp,
        metadata: piMetadata(event)
      });
    case "queue_update":
      return withEvent({
        kind: "queue_update",
        steering: event.steering,
        followUp: event.followUp,
        timestamp,
        metadata: piMetadata(event)
      });
    case "compaction_start":
      return withEvent({
        kind: "compaction_start",
        reason: event.reason,
        timestamp,
        metadata: piMetadata(event)
      });
    case "compaction_end":
      return compactionEndEvent(event, timestamp);
    case "thinking_level_changed":
      return withEvent({
        kind: "thinking_level_changed",
        level: event.level,
        timestamp,
        metadata: piMetadata(event)
      });
    case "session_info_changed":
      return sessionInfoChangedEvent(event, timestamp);
    case "auto_retry_start":
      return withEvent({
        kind: "retry_start",
        attempt: event.attempt,
        maxAttempts: event.maxAttempts,
        delayMs: event.delayMs,
        errorMessage: event.errorMessage,
        timestamp,
        metadata: piMetadata(event)
      });
    case "auto_retry_end":
      return retryEndEvent(event, timestamp);
    default:
      return undefined;
  }
}

function normalizeMessageUpdate(
  event: Extract<AgentSessionEvent, { type: "message_update" }>,
  timestamp: Date
): NormalizedPiEvent | undefined {
  const assistantEvent = event.assistantMessageEvent;

  if (assistantEvent.type === "text_delta") {
    return {
      event: {
        kind: "assistant_message",
        text: assistantEvent.delta,
        timestamp,
        metadata: {
          ...piMetadata(event),
          assistantEventType: assistantEvent.type,
          contentIndex: assistantEvent.contentIndex
        }
      },
      textDelta: assistantEvent.delta
    };
  }

  if (assistantEvent.type === "done") {
    const finalAssistantText = extractAssistantText(assistantEvent.message);

    return {
      event: {
        kind: "assistant_message",
        text: finalAssistantText,
        timestamp,
        metadata: {
          ...piMetadata(event),
          assistantEventType: assistantEvent.type,
          reason: assistantEvent.reason
        }
      },
      finalAssistantText
    };
  }

  if (assistantEvent.type === "error") {
    const finalAssistantText = extractAssistantText(assistantEvent.error);

    return {
      event: {
        kind: "error",
        message: assistantEvent.error.errorMessage ?? finalAssistantText,
        timestamp,
        metadata: {
          ...piMetadata(event),
          assistantEventType: assistantEvent.type,
          reason: assistantEvent.reason
        }
      },
      finalAssistantText
    };
  }

  return withEvent(
    messageEvent({
      kind: "message_update",
      message: event.message,
      timestamp,
      metadata: {
        ...piMetadata(event),
        assistantEventType: assistantEvent.type
      }
    })
  );
}

function normalizeMessageEnd(
  event: Extract<AgentSessionEvent, { type: "message_end" }>,
  timestamp: Date
): NormalizedPiEvent {
  const finalAssistantText = extractAssistantText(event.message);

  return {
    event: messageEvent({
      kind: "message_end",
      message: event.message,
      timestamp,
      metadata: piMetadata(event)
    }),
    finalAssistantText
  };
}

function messageEvent(input: {
  kind: "message_start" | "message_update" | "message_end";
  message: unknown;
  timestamp: Date;
  metadata: Record<string, unknown>;
}): RuntimeEvent {
  const event: RuntimeEvent = {
    kind: input.kind,
    timestamp: input.timestamp,
    metadata: input.metadata
  };
  const role = getMessageRole(input.message);
  const text = extractAssistantText(input.message);

  if (role !== undefined) {
    event.role = role;
  }

  if (text.length > 0) {
    event.text = text;
  }

  return event;
}

function compactionEndEvent(
  event: Extract<AgentSessionEvent, { type: "compaction_end" }>,
  timestamp: Date
): NormalizedPiEvent {
  const runtimeEvent: RuntimeEvent = {
    kind: "compaction_end",
    reason: event.reason,
    aborted: event.aborted,
    willRetry: event.willRetry,
    timestamp,
    metadata: piMetadata(event)
  };

  if (event.errorMessage !== undefined) {
    runtimeEvent.errorMessage = event.errorMessage;
  }

  return { event: runtimeEvent };
}

function sessionInfoChangedEvent(
  event: Extract<AgentSessionEvent, { type: "session_info_changed" }>,
  timestamp: Date
): NormalizedPiEvent {
  const runtimeEvent: RuntimeEvent = {
    kind: "session_info_changed",
    timestamp,
    metadata: piMetadata(event)
  };

  if (event.name !== undefined) {
    runtimeEvent.name = event.name;
  }

  return { event: runtimeEvent };
}

function retryEndEvent(
  event: Extract<AgentSessionEvent, { type: "auto_retry_end" }>,
  timestamp: Date
): NormalizedPiEvent {
  const runtimeEvent: RuntimeEvent = {
    kind: "retry_end",
    success: event.success,
    attempt: event.attempt,
    timestamp,
    metadata: piMetadata(event)
  };

  if (event.finalError !== undefined) {
    runtimeEvent.finalError = event.finalError;
  }

  return { event: runtimeEvent };
}

function withEvent(event: RuntimeEvent): NormalizedPiEvent {
  return { event };
}

function piMetadata(event: AgentSessionEvent): Record<string, unknown> {
  return { piEventType: event.type };
}

function getMessageRole(message: unknown): string | undefined {
  if (
    typeof message === "object" &&
    message !== null &&
    "role" in message &&
    typeof message.role === "string"
  ) {
    return message.role;
  }

  return undefined;
}

function isAssistantMessage(message: unknown): message is {
  role: "assistant";
  content: Array<{ type: string; text?: string }>;
} {
  return (
    typeof message === "object" &&
    message !== null &&
    "role" in message &&
    message.role === "assistant" &&
    "content" in message &&
    Array.isArray(message.content)
  );
}

function extractAssistantText(message: unknown): string {
  if (!isAssistantMessage(message)) {
    return "";
  }

  return message.content
    .filter((content) => content.type === "text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("");
}
