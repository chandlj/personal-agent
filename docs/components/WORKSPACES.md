# Workspace Model

## Purpose

This doc defines how the agent chooses, creates, and uses workspaces.

It is the canonical reference for:

- workspace keys
- directory layout
- lifecycle rules
- session-to-workspace resolution

## Core rule

Each main chat gets one stable workspace.

If subagents are added later, each subagent gets its own isolated child workspace.

This decision is locked by [ADR-002](../decisions/ADR-002-workspace-model.md).

## Workspace identity

Use a stable logical key:

- main agent: `workspace:<platform>:<scope>:<chat_id>:main`
- future subagent: `workspace:<platform>:<scope>:<chat_id>:<agent_id>`

Examples:

- `workspace:telegram:dm:12345:main`
- `workspace:telegram:group:-10012345:main`
- `workspace:telegram:dm:12345:worker-research`

## Exact TypeScript interfaces

```ts
type WorkspaceScope = "dm" | "group" | "channel" | "thread" | "local";

type WorkspaceRecord = {
  id: string;
  workspaceKey: string;
  agentId: string;
  platform?: "telegram" | "slack" | "discord" | "cli";
  chatId?: string;
  threadId?: string;
  parentWorkspaceId?: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
};

type WorkspaceResolveInput = {
  source: "telegram" | "scheduler" | "cli";
  platform?: "telegram" | "slack" | "discord" | "cli";
  scope: WorkspaceScope;
  chatId?: string;
  threadId?: string;
  agentId: string;
  cwd?: string;
};
```

## Directory layout

Suggested host layout:

```text
~/.personal-agent/
  workspaces/
    telegram/
      <chat_id>/
        agents/
          main/
            files/
          <agent_id>/
            files/
```

The workspace root for runtime resolution is the agent-specific directory such as:

- `~/.personal-agent/workspaces/telegram/<chat_id>/agents/main`

### Example workspace

Telegram DM from chat `12345` should resolve to something like:

```text
workspace key: workspace:telegram:dm:12345:main
root path: ~/.personal-agent/workspaces/telegram/12345/agents/main
```

## Resolution rules

### Telegram

- resolve platform and chat identity from the inbound event
- resolve `main` as the agent id for normal conversations
- look up or create the workspace row
- use the workspace root as the session working directory

Example:

```text
Inbound event -> chatId=12345
Resolved workspace -> workspace:telegram:dm:12345:main
Resolved root -> ~/.personal-agent/workspaces/telegram/12345/agents/main
```

### CLI

Start with one of these explicit modes:

- use the current working directory if it already contains a `.personal-agent/` override
- otherwise use the current working directory as an ad hoc workspace root

If CLI session persistence becomes important later, add a stable CLI workspace registry mode explicitly.

### Scheduler

- jobs point to a `workspace_id`
- scheduler resolves the workspace first
- scheduler starts a fresh session attached to that workspace

Example:

```text
Job row -> workspace_id=ws_123
Scheduler lookup -> ~/.personal-agent/workspaces/telegram/12345/agents/main
Run session -> fresh session attached to that root
```

## Lifecycle

### Creation

Create the workspace on first use for a `(platform, chat_id, agent_id)` tuple.

### Reuse

Reuse the same workspace for subsequent sessions owned by the same logical agent.

### Cleanup

Do not auto-delete workspaces in v1.

If cleanup is needed later, make it an explicit operator action.

## Downloads and generated files

- inbound Telegram downloads should land under the current workspace
- generated files should be written under the current workspace unless a tool explicitly targets another allowed path

Do not treat auto-created Telegram or scheduler workspaces as configuration override roots in v1.

## Resource loading

When resolving resources for a session:

1. load global files from `~/.personal-agent/`
2. for operator-owned project roots used through the CLI, optionally load `<workspace-root>/.personal-agent/`

The M1 runtime resource config uses these defaults:

- global root: `~/.personal-agent/`
- workspace override directory: `.personal-agent`
- files: `AGENTS.md`, `SYSTEM.md`, `APPEND_SYSTEM.md`
- directories: `skills/`, `prompts/`, `extensions/`

Do not scan arbitrary ancestor directories in v1.

Do not auto-load `.personal-agent/` from generated chat workspaces under `~/.personal-agent/workspaces/`.

That keeps project-local development overrides available without turning chat-owned state into a persistent runtime customization surface.

## Database contract

`SCHEMA.md` owns the row-level schema for `workspaces`.

This doc owns:

- how keys are formed
- how roots are assigned
- when workspaces are created or reused

## SQLite DDL fragment

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

CREATE INDEX workspaces_platform_chat_idx
  ON workspaces(platform, chat_id);
```

## Non-goals

- automatic workspace garbage collection
- sharing one mutable workspace across multiple subagents
- dynamically switching workspace root mid-session

## Open items

- whether CLI gets a stronger stable-workspace model in v1.1
- whether workspace templates are needed later
