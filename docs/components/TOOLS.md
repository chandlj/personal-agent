# Tool Policy

## Purpose

This doc is the canonical v1 tool and policy matrix.

Use it to answer:

- which tools run in Docker
- which tools may run on the host
- which tools require approval
- which tools are blocked

## Execution classes

- `docker-default`
- `host-approved`
- `pure-app`
- `blocked`

## Exact TypeScript interfaces

```ts
type ToolExecutionClass = "docker-default" | "host-approved" | "pure-app" | "blocked";
type ToolExecutionTarget = "docker" | "host" | "app" | "blocked";

type ToolCallEnvelope = {
  toolName: string;
  arguments: Record<string, unknown>;
  sessionId: string;
  workspaceId?: string;
};

type ToolRoutingDecision = {
  executionClass: ToolExecutionClass;
  target: ToolExecutionTarget;
  requiresApproval: boolean;
  approvalReason?: string;
  blockReason?: string;
};
```

## v1 rules

### `docker-default`

These should run in Docker by default:

- `bash`
- `read`
- `write`
- `edit`
- `grep`
- `find`
- `ls`
- `git` and build/test commands

Example:

```json
{
  "toolName": "bash",
  "arguments": { "command": "bun test" }
}
```

Expected routing:

- execution class: `docker-default`
- target: `docker`
- approval: `no`, unless a higher-level destructive pattern policy says otherwise

### `host-approved`

These are the allowed host-side integrations in v1:

- notifications
- `open`
- AppleScript

Prefer purpose-built tools instead of generic host shell.

Suggested v1 host tools:

- `notification(title, body)`
- `open_target(path_or_url)`
- `run_applescript(script_id, args)`

Example:

```json
{
  "toolName": "open_target",
  "arguments": { "pathOrUrl": "https://example.com" }
}
```

Expected routing:

- execution class: `host-approved`
- target: `host`
- approval: usually `yes`

### `pure-app`

These should stay inside the host process without shell execution:

- memory service actions
- transcript search
- config reads
- repository lookups
- approval state transitions

### `blocked`

Block these by default:

- unrestricted host shell
- arbitrary network-capable host automation
- writes to protected host paths outside policy

Example blocked call:

```json
{
  "toolName": "host_bash",
  "arguments": { "command": "rm -rf ~" }
}
```

Expected result:

- rejected before execution
- audit event recorded with block reason

## Approval policy

| Tool or class | Target | Approval | Notes |
|---|---|---|---|
| Filesystem and repo tools | Docker | No | Main path |
| General bash in Docker | Docker | Pattern-based | Approve destructive patterns if needed |
| Notifications | Host | Usually no | Narrow, purpose-built |
| `open` | Host | Usually yes | Especially for URLs or app launches |
| AppleScript | Host | Yes | Strong allowlist and audit |
| Memory and search actions | Pure app | No | No shell path |

## Example decisions

### Example 1: repo read

Prompt:

```text
Search the repo for TODO comments.
```

Expected behavior:

- tool router uses `grep` or equivalent
- target is Docker
- no host approval involved

### Example 2: notification

Prompt:

```text
Send me a notification when this job finishes.
```

Expected behavior:

- agent uses `notification(title, body)`
- target is host
- may run without approval if policy allows

### Example 3: AppleScript

Prompt:

```text
Open Music and start my focus playlist.
```

Expected behavior:

- agent uses `run_applescript(...)`
- approval required
- execution and result both audited

## Protected path policy

At minimum, protect:

- `~/.ssh`
- `~/.aws`
- `~/.config`
- `~/.gnupg`
- the operator home directory outside approved workspace roots

If access to a protected path is ever allowed later, it should go through an explicit host tool with approval.

## Host tool registration rules

- every host tool must be explicitly registered
- every host tool must declare its approval behavior
- every host tool must emit audit metadata
- every host tool must be documented here before shipping

## Audit expectations

Every executed tool result should retain:

- tool name
- execution class
- execution target
- approval id if any
- start and finish timestamps
- error state if any

Example audit payload:

```json
{
  "toolName": "run_applescript",
  "executionClass": "host-approved",
  "target": "host",
  "approvalId": "appr_123",
  "startedAt": "2026-04-03T16:10:00Z",
  "finishedAt": "2026-04-03T16:10:02Z",
  "success": true
}
```

## Ownership

- `SANDBOXING.md` explains the execution model
- this doc explains the concrete v1 policy inventory
- implementation should keep this matrix in sync with code

## Non-goals

- comprehensive MCP routing policy
- generic host shell support
- fine-grained per-user tool entitlements
