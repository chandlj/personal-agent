# CLI Specification

## Purpose

This doc defines the local CLI and TUI surface for the personal agent.

Use it to answer:

- what the CLI is for
- which commands exist in v1
- how CLI sessions resolve workspaces
- how approvals and admin flows work from the terminal

## Role in the system

The CLI is a first-class frontend alongside:

- Telegram gateway
- scheduler

It uses the same shared runtime, tool router, memory system, and control plane.

The CLI is also the primary local operator surface in v1.

## v1 goals

- provide a local way to chat with the agent
- prove the shared runtime before gateway work expands
- expose operator/admin flows that do not require Telegram
- give the operator a fallback path for approvals and inspection

## Modes

### One-shot mode

Run a prompt, return the result, exit.

Use for:

- quick questions
- admin checks
- scriptable local usage

### Interactive mode

Start a local session loop in the terminal.

Use for:

- iterative prompting
- debugging runtime behavior
- testing resource loading and tools

### TUI mode

The TUI is a presentation mode for the same CLI app.

In v1, the CLI may start with a plain terminal loop first. The TUI can be added as an alternate entry mode without changing the core command model.

### Example usage

One-shot:

```bash
personal-agent chat run "Summarize the open questions in docs/"
```

Current Bun workspace form:

```bash
bun run start:cli -- chat run "Summarize the open questions in docs/"
bun run start:cli -- "Summarize the open questions in docs/"
```

Interactive:

```bash
personal-agent chat start
```

TUI:

```bash
personal-agent chat start --tui
```

## Suggested command groups

### `chat`

Primary agent interaction commands.

Suggested subcommands:

- `chat run <prompt>`: one-shot prompt in the current workspace
- `chat start`: interactive local chat session
- `chat resume <session-id>`: resume a prior local session if supported

Example:

```bash
personal-agent chat run "Review docs/components/SCHEMA.md for missing foreign keys"
```

Exact syntax:

```bash
personal-agent chat run [--cwd <path>] [--json] <prompt>
personal-agent chat start [--cwd <path>] [--model <model>] [--session-key <key>] [--tui]
personal-agent chat resume <session-id>
```

The M1 CLI proof implements `chat run` only. It loads `AppConfig`, creates
`AgentRuntime`, passes an explicit workspace root, opts into workspace-local
resources, then prints the normalized `PromptResult`.

`--cwd <path>` selects the workspace root for the runtime. Without `--cwd`, the
CLI uses the process current working directory. The command also accepts prompt
text on stdin and supports `--json` for the full normalized result.

Live prompt execution requires Pi credentials and model settings that
`@earendil-works/pi-coding-agent` can resolve from the local environment or
`~/.personal-agent/`.

### `sessions`

Inspect and manage session state.

Suggested subcommands:

- `sessions list`
- `sessions show <session-id>`
- `sessions search <query>`
- `sessions reset <session-id>`

Example:

```bash
personal-agent sessions search "workspace model"
```

Exact syntax:

```bash
personal-agent sessions list [--source cli|telegram|scheduler] [--limit <n>]
personal-agent sessions show <session-id>
personal-agent sessions search [--session-id <id>] <query>
personal-agent sessions reset <session-id>
```

### `memory`

Inspect and manage memory stores.

Suggested subcommands:

- `memory show`
- `memory add --store memory|user <text>`
- `memory replace --store memory|user --match <text> <replacement>`
- `memory remove --store memory|user --match <text>`
- `memory search <query>`

Example:

```bash
personal-agent memory add --store user "User prefers concise answers with file references."
```

Exact syntax:

```bash
personal-agent memory show [--store memory|user]
personal-agent memory add --store memory|user <text>
personal-agent memory replace --store memory|user --match <text> <replacement>
personal-agent memory remove --store memory|user --match <text>
personal-agent memory search <query>
```

### `approvals`

Inspect and resolve pending approvals.

Suggested subcommands:

- `approvals list`
- `approvals show <approval-id>`
- `approvals approve <approval-id>`
- `approvals deny <approval-id>`

Example:

```bash
personal-agent approvals approve appr_123
```

Exact syntax:

```bash
personal-agent approvals list [--status pending|approved|denied|expired]
personal-agent approvals show <approval-id>
personal-agent approvals approve <approval-id>
personal-agent approvals deny <approval-id>
```

### `scheduler`

Manage scheduled jobs.

Suggested subcommands:

- `scheduler list`
- `scheduler add ...`
- `scheduler pause <job-id>`
- `scheduler resume <job-id>`
- `scheduler run <job-id>`

Example:

```bash
personal-agent scheduler run job_daily_briefing
```

Exact syntax:

```bash
personal-agent scheduler list [--enabled]
personal-agent scheduler add --name <name> --schedule <expr> --target <target> --prompt <prompt>
personal-agent scheduler pause <job-id>
personal-agent scheduler resume <job-id>
personal-agent scheduler run <job-id>
```

### `gateway`

Local gateway operations.

Suggested subcommands:

- `gateway start`
- `gateway status`
- `gateway tailscale up`
- `gateway tailscale down`
- `gateway tailscale status`

Tailscale-related commands are post-v1, but the namespace can still be reserved.

### `config`

Inspect effective configuration.

Suggested subcommands:

- `config show`
- `config path`
- `config validate`

Example:

```bash
personal-agent config show
```

Exact syntax:

```bash
personal-agent config show [--effective] [--json]
personal-agent config path
personal-agent config validate
```

## Workspace resolution

CLI workspace behavior is intentionally explicit.

### Default v1 rule

- if the current working directory contains `.personal-agent/`, use it as the workspace root
- otherwise use the current working directory as an ad hoc local workspace

The CLI should not silently invent a hidden global workspace for normal chat commands in v1.

### Optional explicit override

Support a flag such as:

- `--cwd <path>`

Use it to run the session against a different workspace root.

Example:

```bash
personal-agent chat run --cwd ~/projects/personal-agent "Run the tests and summarize failures"
```

### Exact CLI flags

Common v1 flags:

- `--cwd <path>`: resolve session against a specific workspace root
- `--model <model>`: override the runtime model for this invocation
- `--json`: emit machine-readable output where supported
- `--session-key <key>`: explicit local session identity for debugging
- `--tui`: start the interactive session in TUI mode when available

### Relationship to `workspaces`

Telegram and scheduler sessions should always resolve through the `workspaces` registry.

CLI may start with ad hoc local workspaces in v1, but any persisted CLI session should still record its resolved workspace root in the database.

## Session behavior

### Runtime path

CLI sessions must use the same:

- `packages/agent-runtime`
- `packages/tool-router`
- `packages/memory`
- `packages/session-store`

Do not create a CLI-only runtime path.

### Persistence

CLI sessions should persist to the same `sessions` and `transcripts` tables as other frontends.

If the operator starts a fresh session with `/new` inside an interactive run, the current active session row should be archived and a fresh session row should be created for the same route key and workspace.

### Commands vs prompts

CLI subcommands are handled by the CLI app itself.

Inside an interactive chat session, slash commands intended for the agent should be forwarded into the session unless the CLI explicitly reserves them.

## Approvals

The CLI is an approval surface in v1.

It should be able to:

- list pending approvals
- show approval details
- approve or deny a request

If a dangerous action originates from a local CLI session, approval may resolve inline in the terminal as long as the event is still recorded in the database.

Approval continuation is best-effort in v1.

If the local process is still waiting on the approval, the tool may resume inline.

If the process exited or restarted, the approval remains recorded for audit and operator visibility, but the action must be retried.

### Example approval flow

1. agent requests `run_applescript(script_id="open-music")`
2. tool router marks it `host-approved`
3. CLI shows pending approval
4. operator runs `personal-agent approvals approve appr_123`
5. if the current process is still waiting, the tool resumes and the approval record is persisted
6. otherwise the approval remains as audit history and the action must be retried

### Example CLI approval transcript

```text
$ personal-agent chat start
> open Music and start my focus playlist
status: approval required
approval: appr_123
approval type: applescript
request: Allow AppleScript to open Music.app and start playlist "Focus"?

$ personal-agent approvals show appr_123
status: pending
request: Allow AppleScript to open Music.app and start playlist "Focus"?

$ personal-agent approvals approve appr_123
approved: appr_123
```

## Output behavior

### One-shot mode

- print final answer to stdout
- print operational errors to stderr
- optionally print structured output with a flag later

### Interactive mode

- show assistant text progressively if streaming is enabled
- show status updates without polluting transcript text
- show approval pauses clearly

### Example interactive transcript

```text
> summarize the docs roadmap
status: loading resources
status: searching transcripts
assistant: v1 covers the shared runtime, Telegram gateway, scheduler, and local memory...
```

## Non-goals for v1

- building a separate CLI-only command runtime
- adding a large plugin shell around the CLI itself
- requiring the TUI before local prompting works

## Ownership

- `docs/STRUCTURE.md` defines where `apps/cli` lives
- this doc defines the CLI product surface
- `docs/components/WORKSPACES.md` defines the workspace rules the CLI follows
- `docs/operations/OPERATIONS.md` defines how the CLI is used operationally

## Open items

- final command names
- whether `chat resume` ships in v1 or later
- whether TUI mode lands in `v1` or `v1.1`
