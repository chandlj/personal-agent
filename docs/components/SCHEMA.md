# Database Schema

## Recommendation

Use SQLite as the single local control-plane database.

It should own:

- workspace registry
- session metadata
- transcript storage
- scheduled jobs
- approvals
- memory metadata
- job delivery audit

Keep large binary files and downloaded attachments on disk, not in SQLite.

## Database file

Suggested path:

```text
~/.personal-agent/state/state.db
```

## Migration strategy

Use numbered forward-only migrations.

Recommended naming:

- `0001_initial.sql`
- `0002_inter_agent.sql`
- `0003_post_v1_features.sql`

For now, the scaffold includes:

- `0001_initial.sql`

Reserve `0002_inter_agent.sql` for the post-v1 mailbox work.

## Core tables

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

Example DDL:

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  workspace_key TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL,
  platform TEXT,
  chat_id TEXT,
  thread_id TEXT,
  parent_workspace_id TEXT REFERENCES workspaces(id),
  root_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);
```

### `sessions`

Tracks conversation instances across CLI, gateway, and scheduler.

The important distinction is:

- `session_key` is the stable route key for a chat or local binding
- `id` is the concrete conversation instance

That means `/new` and `/reset` create a new session row with the same `session_key` while archiving the previous active row.

Columns:

- `id` - primary key
- `workspace_id` - foreign key to `workspaces`
- `agent_id` - logical agent name such as `main`
- `session_key` - stable route key such as `agent:main:telegram:dm:12345`
- `reset_from_session_id` - nullable self-reference to the prior session row when the session was started via `/new` or `/reset`
- `source` - `cli`, `telegram`, `scheduler`, etc.
- `platform` - nullable platform name
- `chat_id` - nullable chat identifier
- `thread_id` - nullable thread identifier
- `title` - optional human label
- `status` - `active`, `archived`, `closed`
- `created_at`
- `updated_at`
- `last_message_at`

Indexes:

- index on `session_key`
- partial unique index on `session_key` where `status = 'active'`
- index on `workspace_id`
- index on `source`
- index on `platform`, `chat_id`

Example DDL:

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  agent_id TEXT NOT NULL,
  session_key TEXT NOT NULL,
  reset_from_session_id TEXT REFERENCES sessions(id),
  source TEXT NOT NULL,
  platform TEXT,
  chat_id TEXT,
  thread_id TEXT,
  title TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT
);

CREATE UNIQUE INDEX sessions_active_session_key_idx
  ON sessions(session_key)
  WHERE status = 'active';
```

### `transcripts`

Stores the normalized transcript stream for each session.

Columns:

- `id` - primary key
- `session_id` - foreign key to `sessions`
- `role` - `system`, `user`, `assistant`, `tool`
- `message_type` - normalized subtype such as `text`, `tool_call`, `tool_result`, `status`
- `text` - canonical text content
- `payload_json` - structured metadata
- `created_at`

Indexes:

- index on `session_id`, `created_at`
- full-text search handled by companion FTS table

Example DDL:

```sql
CREATE TABLE transcripts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  message_type TEXT NOT NULL,
  text TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
```

### `transcripts_fts`

FTS5 virtual table for transcript search.

Suggested fields:

- `text`
- `session_id`
- `transcript_id`

Keep the FTS table synchronized via triggers.

### `jobs`

Stores scheduled job definitions.

Columns:

- `id`
- `name`
- `prompt`
- `schedule`
- `timezone`
- `delivery_target`
- `workspace_id`
- `origin_session_id`
- `enabled`
- `skills_json`
- `created_by`
- `created_at`
- `updated_at`
- `last_run_at`
- `next_run_at`

Indexes:

- index on `enabled`, `next_run_at`
- index on `workspace_id`

Example DDL:

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule TEXT NOT NULL,
  timezone TEXT NOT NULL,
  delivery_target TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  origin_session_id TEXT REFERENCES sessions(id),
  enabled INTEGER NOT NULL DEFAULT 1,
  skills_json TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_run_at TEXT,
  next_run_at TEXT
);
```

### `job_runs`

Stores each execution of a scheduled job.

Columns:

- `id`
- `job_id`
- `status` - `running`, `success`, `failed`, `cancelled`
- `started_at`
- `finished_at`
- `session_id`
- `output_text`
- `error_text`

Indexes:

- index on `job_id`, `started_at`

### `job_deliveries`

Stores outbound delivery attempts for scheduled job runs.

Columns:

- `id`
- `job_run_id`
- `target`
- `status` - `pending`, `sent`, `failed`
- `platform` - nullable platform name
- `chat_id` - nullable chat identifier
- `path` - nullable file target
- `external_message_id` - nullable provider message id
- `attempted_at`
- `delivered_at`
- `error_text`

Indexes:

- index on `job_run_id`, `attempted_at`

### `approvals`

Stores pending and resolved dangerous-action approvals.

These rows are an audit and operator-control surface, not a durable continuation queue.

For v1, approval resumption is best-effort:

- if the originating process is still waiting, it may resume
- if the process restarted or lost state, the approval remains recorded but the action must be retried

Columns:

- `id`
- `session_id`
- `approval_type` - `host_command`, `applescript`, etc.
- `request_text`
- `request_payload_json`
- `status` - `pending`, `approved`, `denied`, `expired`
- `requested_by`
- `resolved_by`
- `requested_at`
- `resolved_at`

Indexes:

- index on `status`, `requested_at`

Example DDL:

```sql
CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  approval_type TEXT NOT NULL,
  request_text TEXT NOT NULL,
  request_payload_json TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  requested_by TEXT,
  resolved_by TEXT,
  requested_at TEXT NOT NULL,
  resolved_at TEXT
);
```

### `memory_entries`

Stores a structured mirror and audit trail for file-backed prompt memory.

`MEMORY.md` and `USER.md` remain canonical. This table is written by the memory service whenever it changes those files.

Columns:

- `id`
- `store` - `memory` or `user`
- `entry_key`
- `content`
- `source`
- `session_id`
- `status` - `active`, `superseded`, `deleted`
- `created_at`
- `updated_at`

Indexes:

- index on `store`, `status`, `updated_at`

## Required foreign key relationships

Use real foreign keys for the core graph.

- `sessions.workspace_id` -> `workspaces.id`
- `transcripts.session_id` -> `sessions.id`
- `jobs.workspace_id` -> `workspaces.id`
- `jobs.origin_session_id` -> `sessions.id`
- `sessions.reset_from_session_id` -> `sessions.id`
- `job_runs.job_id` -> `jobs.id`
- `job_runs.session_id` -> `sessions.id`
- `job_deliveries.job_run_id` -> `job_runs.id`
- `approvals.session_id` -> `sessions.id`
- `memory_entries.session_id` -> `sessions.id`

Prefer soft deletes for `workspaces`, `sessions`, and `jobs` rather than hard-deleting rows that still have transcript or audit history attached.

## Post-v1 tables

### `agent_endpoints`

Tracks live or recently seen agent endpoints.

Columns:

- `agent_id`
- `session_id`
- `runtime_type` - `embedded`, `worker`, `scheduler`, `gateway`
- `status` - `online`, `idle`, `busy`, `offline`
- `process_id`
- `capabilities_json`
- `last_seen_at`
- `created_at`

Indexes:

- primary key on `agent_id`
- index on `status`

### `agent_messages`

Durable mailbox for cross-process or deferred inter-agent communication.

Columns:

- `id`
- `from_agent_id`
- `to_agent_id`
- `message_type`
- `payload_json`
- `status` - `pending`, `delivered`, `acknowledged`, `failed`
- `correlation_id`
- `created_at`
- `delivered_at`
- `acknowledged_at`
- `error_text`

Indexes:

- index on `to_agent_id`, `status`, `created_at`
- index on `correlation_id`

## File-backed state that should not live in SQLite

- downloaded Telegram files
- workspace sandboxes
- canonical `MEMORY.md` and `USER.md`
- long exported transcripts

## Recommended first migration split

### `0001_initial.sql`

Include:

- `workspaces`
- `sessions`
- `transcripts`
- `transcripts_fts`
- triggers for transcript FTS sync
- `jobs`
- `job_runs`
- `job_deliveries`
- `approvals`
- `memory_entries`

### `0002_inter_agent.sql`

Include:

- `agent_endpoints`
- `agent_messages`

This keeps the core app schema separate from the inter-agent layer.

## Suggested repository ownership

`packages/session-store` should own typed repositories for:

- workspaces
- sessions
- transcripts
- jobs
- job deliveries
- approvals
- memory
- agent mailbox

Do not let gateway or scheduler apps write raw SQL directly once this package is in place.
