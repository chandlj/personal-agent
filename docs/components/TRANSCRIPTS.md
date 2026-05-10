# Transcript And Event Model

## Purpose

This doc defines the canonical normalized event model persisted into `transcripts`.

Use it to avoid ad hoc `payload_json` shapes drifting across gateway, runtime, scheduler, and approvals.

## Storage rule

`transcripts` stores the ordered event stream for a session.

The table schema lives in [SCHEMA.md](./SCHEMA.md). This doc defines the event contract.

## Canonical columns

- `session_id`
- `role`
- `message_type`
- `text`
- `payload_json`
- `created_at`

## `role` values

- `system`
- `user`
- `assistant`
- `tool`

## `message_type` values

Use a small stable set in v1:

- `text`
- `attachment`
- `tool_call`
- `tool_result`
- `status`
- `approval_request`
- `approval_resolution`
- `delivery`

## Exact TypeScript interfaces

```ts
type TranscriptRole = "system" | "user" | "assistant" | "tool";

type TranscriptMessageType =
  | "text"
  | "attachment"
  | "tool_call"
  | "tool_result"
  | "status"
  | "approval_request"
  | "approval_resolution"
  | "delivery";

type TranscriptRow = {
  session_id: string;
  role: TranscriptRole;
  message_type: TranscriptMessageType;
  text: string | null;
  payload_json: Record<string, unknown> | null;
  created_at: string;
};

type ToolCallPayload = {
  toolName: string;
  arguments: Record<string, unknown>;
  executionClass: "docker-default" | "host-approved" | "pure-app" | "blocked";
  target: "docker" | "host" | "app" | "blocked";
};

type ToolResultPayload = {
  toolName: string;
  success: boolean;
  executionClass: "docker-default" | "host-approved" | "pure-app" | "blocked";
  target: "docker" | "host" | "app" | "blocked";
  approvalId: string | null;
  exitCode?: number;
};
```

## Event shapes

### User text

```json
{
  "source": "telegram",
  "messageId": "123",
  "chatId": "456",
  "attachments": []
}
```

### Assistant text

```json
{
  "deliveryMode": "final"
}
```

### Tool call

```json
{
  "toolName": "bash",
  "arguments": {
    "command": "ls"
  },
  "executionClass": "docker-default",
  "target": "docker"
}
```

### Tool result

```json
{
  "toolName": "bash",
  "success": true,
  "executionClass": "docker-default",
  "target": "docker",
  "approvalId": null,
  "exitCode": 0
}
```

### Status event

```json
{
  "kind": "progress",
  "label": "running-command"
}
```

### Approval request

```json
{
  "approvalId": "appr_123",
  "approvalType": "applescript"
}
```

### Approval resolution

```json
{
  "approvalId": "appr_123",
  "status": "approved",
  "resolvedBy": "telegram:123456789"
}
```

### Delivery event

```json
{
  "target": "telegram-chat:12345",
  "status": "sent",
  "externalMessageId": "999"
}
```

## Worked example

Given a Telegram user message:

```text
Run the tests and tell me what failed.
```

the transcript stream might look like:

1. `role=user`, `message_type=text`
2. `role=assistant`, `message_type=status`, `text="Running tests"`
3. `role=tool`, `message_type=tool_call`, payload with `toolName="bash"`
4. `role=tool`, `message_type=tool_result`, payload with `exitCode=1`
5. `role=assistant`, `message_type=text`, final summary of failures

### Example rows

User row:

```json
{
  "role": "user",
  "message_type": "text",
  "text": "Run the tests and tell me what failed.",
  "payload_json": {
    "source": "telegram",
    "messageId": "111",
    "chatId": "12345",
    "attachments": []
  }
}
```

Tool result row:

```json
{
  "role": "tool",
  "message_type": "tool_result",
  "text": "Command exited with status 1",
  "payload_json": {
    "toolName": "bash",
    "success": false,
    "executionClass": "docker-default",
    "target": "docker",
    "exitCode": 1
  }
}
```

## Rules

- `text` should contain the canonical human-readable content when available
- `payload_json` should only carry structured metadata, not duplicate large text bodies
- keep keys stable and camelCase
- do not store raw platform payloads as the primary transcript format
- binary attachments stay on disk, with transcript rows referencing their metadata

## SQLite DDL fragment

```sql
CREATE TABLE transcripts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  message_type TEXT NOT NULL CHECK (
    message_type IN (
      'text',
      'attachment',
      'tool_call',
      'tool_result',
      'status',
      'approval_request',
      'approval_resolution',
      'delivery'
    )
  ),
  text TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX transcripts_session_created_idx
  ON transcripts(session_id, created_at);
```

## Ownership boundaries

- gateway adapters normalize inbound and outbound message events
- runtime and tool router emit tool and status events
- scheduler emits run-related session events
- approval flows emit approval request and resolution events

## Non-goals

- storing provider-native raw events as first-class transcript records
- building a generic event-sourcing system beyond what the agent needs
