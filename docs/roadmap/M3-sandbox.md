# M3 Sandbox Foundation

## Goal

Run file and shell tools through Docker by default, with narrow host executors for approved macOS integrations.

## Why now

Execution boundaries must exist before the agent is exposed through a gateway.

## Dependencies

- [M0 Repo Bootstrap](./M0-repo-bootstrap.md)
- [M1 Shared Runtime](./M1-shared-runtime.md)

## Scope

- implement Docker executor
- implement host executor
- add shared sandbox types
- add timeout and cancellation support
- add initial tool classification policy

## Non-goals

- rich approval UX
- broad host shell access

## Schema/config changes

- Docker image and mount config
- allowed host integration config

## Exit criteria

- shell commands can run in Docker
- host commands can run through the guarded host path
- execution target is explicit and auditable

## Open questions

- container lifecycle strategy per workspace
