# Tool Policy

## Purpose

This doc is the canonical v1 tool and policy matrix.

Use it to answer:

- which tools use command execution
- which command backend they use
- which host integrations require approval
- which tools are pure app logic
- which tools are blocked

## Execution model

The agent runtime owns tool definitions and dispatch. There is no standalone v1 tool router.

Tool handlers fall into three groups:

- command-backed tools: shell and filesystem work executed through the configured backend
- app-native tools: memory, transcript search, config reads, and approval state transitions
- blocked tools: unsupported or unsafe host actions rejected before execution

Command execution backends:

```ts
type ExecutionBackend = "docker" | "local";

type ExecutionRequest = {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  metadata?: {
    toolName?: string;
    sessionId?: string;
    workspaceId?: string;
    workspaceKey?: string;
    approvalId?: string;
  };
};
```

## v1 rules

### Command-backed tools

These should use Docker by default:

- `bash`
- `read`
- `write`
- `edit`
- `grep`
- `find`
- `ls`
- git and build/test commands

Example:

```json
{
  "toolName": "bash",
  "arguments": { "command": "bun test" }
}
```

Expected behavior:

- runtime invokes the configured command backend
- backend is `docker` by default
- approval is not required unless destructive-pattern policy says otherwise

### Local host integrations

These are allowed only as explicit host-side integrations:

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

Expected behavior:

- runtime invokes a purpose-built host tool or an explicitly enabled local backend
- approval is usually required for app launches, URLs, and AppleScript
- unrestricted local shell remains disabled by default

### App-native tools

These stay inside the runtime process without shell execution:

- memory service actions
- transcript search
- config reads
- repository lookups
- approval state transitions

### Blocked tools

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

| Tool class | Backend or path | Approval | Notes |
|---|---|---|---|
| Filesystem and repo tools | Docker command backend | No | Main path |
| General bash | Docker command backend | Pattern-based | Approve destructive patterns if needed |
| Notifications | Purpose-built local tool | Usually no | Narrow, registered behavior |
| `open` | Purpose-built local tool | Usually yes | Especially for URLs or app launches |
| AppleScript | Purpose-built local tool | Yes | Strong allowlist and audit |
| Memory and search actions | Runtime process | No | No shell path |

## Protected path policy

At minimum, protect:

- `~/.ssh`
- `~/.aws`
- `~/.config`
- `~/.gnupg`
- the operator home directory outside approved workspace roots

If access to a protected path is ever allowed later, it should go through an explicit host tool
with approval.

## Audit expectations

Every executed command result should retain:

- tool name
- execution backend
- approval id if any
- start and finish timestamps
- duration and timeout/cancellation state
- command and cwd
- error state if any

Example audit payload:

```json
{
  "toolName": "bash",
  "backend": "docker",
  "approvalId": "appr_123",
  "startedAt": "2026-04-03T16:10:00Z",
  "finishedAt": "2026-04-03T16:10:02Z",
  "success": true
}
```

## Ownership

- `SANDBOXING.md` explains the command execution model
- this doc explains the concrete v1 policy inventory
- implementation should keep this matrix in sync with `agent-runtime`

## Non-goals

- comprehensive MCP routing policy
- generic host shell support
- fine-grained per-user tool entitlements
