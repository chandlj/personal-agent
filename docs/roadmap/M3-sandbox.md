# M3 Runtime Execution Backends

## Goal

Run file and shell tools through a configurable command backend owned by `agent-runtime`.
Docker is the default backend. Local execution is explicit and disabled by default.

## Why now

Execution boundaries must exist before the agent is exposed through a gateway. Keeping
tool dispatch and command execution inside `agent-runtime` avoids a separate router package
until there is real dynamic routing behavior to isolate.

## Dependencies

- [M0 Repo Bootstrap](./M0-repo-bootstrap.md)
- [M1 Shared Runtime](./M1-shared-runtime.md)

## Scope

- implement a Docker command backend
- implement a guarded local command backend
- add runtime-owned command execution types
- add timeout support for foreground commands
- prepare runtime tool handlers to use the configured command backend
- validate risky Docker runtime config before container creation

## Non-goals

- rich approval UX
- broad host shell access
- background process management
- SSH, OpenShell, or node-host execution backends
- browser sandboxing
- standalone tool-router package

## Schema/config changes

- Docker image and mount config
- command backend config

## Exit criteria

- shell commands can run through the Docker backend
- one long-lived Docker container is reused per workspace
- local command execution is denied by default unless explicitly enabled
- execution backend is explicit and auditable
- Docker config validation blocks dangerous binds, privileged containers, Docker socket exposure, and unconfined host-like profiles
- pure app tools such as memory do not flow through command execution

## Final decisions

- command backends are `docker` and `local`
- `app` is not an execution backend; app-native tools are direct runtime handlers
- Docker containers are long-lived per workspace and commands run with `docker exec`
- M3 supports foreground command execution only; a future `process` tool can manage background commands
- local execution is an explicit backend for later host integrations, not the default shell path
- approval prompts and durable approval rows remain M6 scope
