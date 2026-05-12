# Database Schema

## Recommendation

Use SQLite as the single local control-plane database.

For M2, SQLite owns only the state required for chat and gateway usage:

- workspace registry
- session metadata and active-session routing
- session-entry tree history
- full-text search over session-entry text

Later milestones add their own tables:

- M6 Approvals: `approvals`
- M7 Scheduler: `jobs`, `job_runs`, `job_deliveries`
- M8 Memory: `memory_entries`
- v2 Inter-agent: `agent_endpoints`, `agent_messages`

Keep large binary files, downloaded attachments, workspace sandboxes, and canonical memory files on disk, not in SQLite.

## Database file

Suggested path:

```text
~/.personal-agent/state/state.db
```

## Migration strategy

Use numbered forward-only migrations.

Recommended split:

- `0001_initial.sql` - chat/gateway control plane
- M6 migration - approvals
- M7 migration - scheduler jobs and delivery audit
- M8 migration - memory audit metadata
- v2 migration - inter-agent mailbox

## M2 Core Tables

### `workspaces`

Tracks the stable working directory assigned to a logical agent.

For v1, each main chat gets one stable workspace. Post-v1 subagents get their own child workspaces.

Columns:

- `id` - primary key
- `workspace_key` - stable logical key such as `workspace:telegram:dm:12345:main`
- `agent_id` - logical owner such as `main`
- `platform` - nullable platform name
- `chat_id` - nullable chat identifier
- `thread_id` - nullable thread identifier
- `parent_workspace_id` - nullable foreign key to `workspaces`
- `root_path` - absolute host path for the workspace root
- `created_at`
- `updated_at`
- `last_used_at`

Indexes:

- unique index on `workspace_key`
- index on `platform`, `chat_id`
- index on `parent_workspace_id`

### `sessions`

Tracks conversation instances across CLI and gateway frontends.

The important distinction is:

- `session_key` is the stable route key for a chat or local binding
- `id` is the concrete conversation instance

That means `/new`, `/reset`, `/fork`, or `/clone` can create a new session row while preserving durable lineage.

Columns:

- `id` - primary key
- `workspace_id` - foreign key to `workspaces`
- `session_key` - stable route key such as `agent:main:telegram:dm:12345`
- `parent_session_id` - nullable self-reference for sessions created from another session
- `runtime_provider` - runtime owner, such as `pi`
- `runtime_session_id` - nullable provider/runtime session id
- `runtime_session_path` - nullable provider/runtime session file path
- `active_leaf_entry_id` - nullable foreign key to the current `session_entries` leaf
- `source` - `cli`, `telegram`, etc.
- `title` - optional human label
- `status` - `active`, `archived`, `closed`
- `created_at`
- `updated_at`
- `last_message_at`

Indexes:

- index on `session_key`
- partial unique index on `session_key` where `status = 'active'`
- index on `workspace_id`
- index on `parent_session_id`
- index on `runtime_provider`, `runtime_session_id`
- index on `source`

### `session_entries`

Stores the append-only conversation history for a session.

Session entries form a tree rather than a flat list. Each entry points at its parent entry, and the session row records the active leaf. Building runtime context means walking from the active leaf back to the root and then reversing that path.

This shape is runtime-neutral, but it is intentionally compatible with Pi's session model, where `/tree` moves the active leaf and `/fork` or `/clone` creates a new session from an existing path.

Columns:

- `id` - primary key
- `session_id` - foreign key to `sessions`
- `parent_entry_id` - nullable foreign key to `session_entries`
- `runtime_entry_id` - nullable provider/runtime entry id
- `entry_type` - `message`, `state_change`, `compaction`, `branch_summary`, `label`, `metadata`, or `custom`
- `role` - nullable role such as `system`, `user`, `assistant`, `tool`, or `custom`
- `message_type` - nullable subtype such as `text`, `attachment`, `tool_call`, `tool_result`, or `status`
- `text` - canonical searchable text content
- `payload_json` - runtime-neutral structured metadata
- `runtime_payload_json` - provider/runtime-specific raw payload when useful
- `created_at`

Indexes:

- index on `session_id`, `created_at`
- index on `session_id`, `parent_entry_id`
- unique index on `session_id`, `runtime_entry_id` where `runtime_entry_id IS NOT NULL`

### `session_entries_fts`

FTS5 virtual table for session-entry search.

Suggested fields:

- `entry_id`
- `session_id`
- `text`

Keep the FTS table synchronized via triggers on `session_entries`.

## Required M2 Foreign Keys

Use real foreign keys for the core graph.

- `sessions.workspace_id` -> `workspaces.id`
- `sessions.parent_session_id` -> `sessions.id`
- `sessions.active_leaf_entry_id` -> `session_entries.id`
- `session_entries.session_id` -> `sessions.id`
- `session_entries.parent_entry_id` -> `session_entries.id`

Prefer soft deletes for `workspaces` and `sessions` rather than hard-deleting rows that still have transcript or audit history attached.

## Deferred Tables

### M6: `approvals`

Stores pending and resolved dangerous-action approvals.

These rows are an audit and operator-control surface, not a durable continuation queue. Approval resumption is best-effort: if the originating process is still waiting, it may resume; otherwise the approval remains recorded and the action must be retried.

### M7: `jobs`, `job_runs`, `job_deliveries`

Stores scheduled job definitions, each scheduled execution, and outbound delivery attempts for run results.

### M8: `memory_entries`

Stores a structured mirror and audit trail for file-backed prompt memory. `MEMORY.md` and `USER.md` remain canonical.

### v2: `agent_endpoints`, `agent_messages`

Tracks live agent endpoints and durable cross-process inter-agent messages.

## Suggested Repository Ownership

`packages/session-store` should own typed repositories for:

- workspaces
- sessions
- session entries
- approvals, added in M6
- jobs and job deliveries, added in M7
- memory, added in M8
- agent mailbox, added in v2

Do not let gateway, scheduler, approval, or memory packages write raw SQL directly once their repositories exist.
