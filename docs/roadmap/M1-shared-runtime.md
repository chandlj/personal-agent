# M1 Shared Runtime

## Goal

Create one reusable way to start agent sessions across CLI, gateway, and scheduler.

## Why now

The shared runtime is the central integration point for tools, resources, memory, and frontends.

## Dependencies

- [M0 Repo Bootstrap](./M0-repo-bootstrap.md)

## Scope

- implement `packages/agent-runtime`
- wire `DefaultResourceLoader`
- load `AGENTS.md`, `SYSTEM.md`, `APPEND_SYSTEM.md`, `skills/`, `prompts/`, and `extensions/`
- add a minimal CLI command for local prompting

## Non-goals

- Telegram integration
- scheduling
- persistent state beyond what is needed to run locally

## Schema/config changes

- resource path config

## Exit criteria

- local CLI can run a prompt
- resource files are visible to the runtime
- future frontends can reuse the same session creation path

## Open questions

- any runtime options that must be exposed immediately
