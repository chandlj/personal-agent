# M3 Sandbox Foundation

## Goal

Run file and shell tools through Docker by default, with narrow host executors for approved macOS integrations.

## Why now

Execution boundaries must exist before the agent is exposed through a gateway.

## Dependencies

- [M0 Repo Bootstrap](./M0-repo-bootstrap.md)
- [M1 Shared Runtime](./M1-shared-runtime.md)

## Scope

- implement a Docker sandbox executor
- implement a guarded host executor boundary
- add shared sandbox types
- add timeout support for foreground commands
- add initial tool classification policy
- validate risky Docker runtime config before container creation

## Non-goals

- rich approval UX
- broad host shell access
- background process management
- SSH, OpenShell, or node-host execution backends
- browser sandboxing

## Schema/config changes

- Docker image and mount config
- allowed host integration config

## Exit criteria

- shell commands can run in a Docker sandbox
- one long-lived Docker container is reused per workspace
- host command execution is denied by default and only reachable through an explicit internal boundary
- execution target is explicit and auditable
- Docker config validation blocks dangerous binds, privileged containers, Docker socket exposure, and unconfined host-like profiles

## Final decisions

- public execution targets are `sandbox`, `host`, `app`, and `blocked`
- M3 implements the `sandbox` target with Docker; later backends can fit behind the same target
- sandbox containers are long-lived per workspace and commands run with `docker exec`
- M3 supports foreground command execution only; a future `process` tool can manage background commands
- host execution is a typed boundary for later host integrations, not a general host shell
- approval prompts and durable approval rows remain M6 scope
