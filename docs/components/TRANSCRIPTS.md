# Session Entry And Transcript Model

## Purpose

This doc defines the canonical normalized event model persisted into `session_entries`.

Use it to avoid ad hoc `payload_json` shapes drifting across gateway, runtime, scheduler, and approvals while preserving tree-shaped session history.

## Storage Rule

`session_entries` stores the append-only event tree for a session.

The table schema lives in [SCHEMA.md](./SCHEMA.md). This doc defines the event contract.

## Tree Model

Each entry has:

- `id` - our durable database id
- `session_id` - owning session
- `parent_entry_id` - previous entry on this branch, or `null` for a root entry
- `runtime_entry_id` - optional provider/runtime id

The active conversation path is not "all rows ordered by time." It is the path from `sessions.active_leaf_entry_id` back to the root.

This preserves the behavior needed for:

- branching in place
- fork/clone into a new session
- rewind-style navigation by moving the active leaf
- branch summaries and compaction entries

## Canonical Columns

- `session_id`
- `parent_entry_id`
- `runtime_entry_id`
- `entry_type`
- `role`
- `message_type`
- `text`
- `payload_json`
- `runtime_payload_json`
- `created_at`

## `entry_type` Values

Use a small stable set:

- `message`
- `state_change`
- `compaction`
- `branch_summary`
- `label`
- `metadata`
- `custom`

## `role` Values

For `entry_type = "message"`:

- `system`
- `user`
- `assistant`
- `tool`
- `custom`

Other entry types may leave `role` null.

## `message_type` Values

Use a small stable set in v1:

- `text`
- `attachment`
- `tool_call`
- `tool_result`
- `status`

Later milestones may add:

- M6: `approval_request`, `approval_resolution`
- M7: `delivery`

## Exact TypeScript Interfaces

```ts
type SessionEntryType =
  | "message"
  | "state_change"
  | "compaction"
  | "branch_summary"
  | "label"
  | "metadata"
  | "custom";

type SessionEntryRole = "system" | "user" | "assistant" | "tool" | "custom";

type SessionMessageType = "text" | "attachment" | "tool_call" | "tool_result" | "status";

type SessionEntryRow = {
  id: string;
  session_id: string;
  parent_entry_id: string | null;
  runtime_entry_id: string | null;
  entry_type: SessionEntryType;
  role: SessionEntryRole | null;
  message_type: SessionMessageType | null;
  text: string | null;
  payload_json: Record<string, unknown> | null;
  runtime_payload_json: Record<string, unknown> | null;
  created_at: string;
};
```

## Payload Shapes

### User Text

```json
{
  "source": "telegram",
  "messageId": "123",
  "chatId": "456",
  "attachments": []
}
```

### Assistant Text

```json
{
  "deliveryMode": "final"
}
```

### Tool Call

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

### Tool Result

```json
{
  "toolName": "bash",
  "success": true,
  "executionClass": "docker-default",
  "target": "docker",
  "exitCode": 0
}
```

### Status Event

```json
{
  "kind": "progress",
  "label": "running-command"
}
```

### Compaction

```json
{
  "summary": "Earlier context was summarized.",
  "firstKeptEntryId": "entry_123",
  "tokensBefore": 50000
}
```

### Branch Summary

```json
{
  "summary": "The abandoned branch explored approach A.",
  "fromEntryId": "entry_456"
}
```

## Worked Example

Given a Telegram user message:

```text
Run the tests and tell me what failed.
```

the active branch might look like:

1. `role=user`, `message_type=text`
2. `role=assistant`, `message_type=status`, `text="Running tests"`
3. `role=tool`, `message_type=tool_call`, payload with `toolName="bash"`
4. `role=tool`, `message_type=tool_result`, payload with `exitCode=1`
5. `role=assistant`, `message_type=text`, final summary of failures

Each row points to the prior row through `parent_entry_id`. If the user rewinds to row 1 and asks a different question, the next row becomes a second child of row 1 rather than replacing history.

## Rules

- `text` should contain canonical human-readable content when available.
- `payload_json` should carry runtime-neutral structured metadata.
- `runtime_payload_json` may carry provider/runtime-specific raw data for replay/debugging.
- keep keys stable and camelCase.
- do not make provider-native raw payloads the primary transcript contract.
- binary attachments stay on disk, with session-entry rows referencing their metadata.

## Ownership Boundaries

- gateway adapters normalize inbound and outbound message events
- runtime and tool router emit tool and status events
- approval flows add approval event types in M6
- scheduler emits delivery/run-related session events in M7

## Non-goals

- forcing every runtime into Pi-specific entry names
- building a generic event-sourcing system beyond what the agent needs
