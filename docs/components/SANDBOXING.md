# Sandboxing Design

## Recommendation

Use a hybrid model:

- Docker for most execution
- a guarded host executor for the small set of tools that truly need macOS access
- policy enforcement in code, not just in prompts

This is the right fit for your Mac setup.

## Default rule

Everything that touches files or shells should run in Docker unless there is a specific reason not to.

That includes:

- `bash`
- `read`
- `write`
- `edit`
- `grep`
- `find`
- `ls`
- git and build commands

## Host-only rule

Only send tools to the host when the integration genuinely requires it.

Examples:

- AppleScript and `osascript`
- desktop notifications
- `open`
- selected local automation tools
- direct access to host-only secrets or APIs you intentionally expose

## Enforcement model

You need three layers.

### 1. Routing layer

A tool router decides whether a call is:

- `docker`
- `host`
- `blocked`

This should happen before any execution.

### 2. Host policy layer

Host tools should require:

- explicit tool registration
- path allowlists
- optional network allowlists
- destructive command approval
- audit logging

### 3. OS-level sandbox for host commands

Wrap host shell execution with `@anthropic-ai/sandbox-runtime` where possible.

Why:

- pi already has a working extension example for this
- it uses native OS sandboxing primitives
- on macOS that means `sandbox-exec`; on Linux it uses `bubblewrap`

This should be treated as defense in depth, not as your only boundary.

## Docker model

Keep the Docker side simple.

Recommendation:

- run one long-lived container per workspace or agent profile
- bind-mount only the directories you want the agent to see
- use a fixed working directory like `/workspace`
- install tools inside the container, not on the host

Start by shelling out to the `docker` CLI from the Bun process. That matches the simplicity of `pi-mom` and is enough for a personal harness.

## Docker hardening

Use at least:

- dropped capabilities
- `no-new-privileges`
- PID limits
- tmpfs for temp dirs
- restricted env passthrough
- minimal mounted paths

On macOS, remember the container boundary is really Docker Desktop's Linux VM, so host file mounts are the key trust boundary.

## Tool design guidance

Prefer purpose-built host tools over general host bash.

Good:

- `mac_notification(title, body)`
- `open_app(name)`
- `run_applescript(script_id, args)`

Bad:

- unrestricted `host_bash`

If you must keep host bash, keep it disabled by default and put it behind explicit approval.

## Minimal policy table

| Tool class | Default target | Approval | Notes |
|---|---|---|---|
| file and repo tools | Docker | No | Main working path |
| general bash | Docker | Optional | Approval for destructive patterns |
| host integrations | Host | Usually yes | Strong allowlist |
| memory and DB tools | Host process | No shell | Pure app-layer logic |

## Practical implementation inside pi

Use pi extension hooks for:

- overriding built-in tools
- blocking unsafe paths
- confirming destructive actions
- swapping bash operations to sandboxed host execution

The key point is that pi already gives you the interception points. You only need to add your routing and policy logic.
