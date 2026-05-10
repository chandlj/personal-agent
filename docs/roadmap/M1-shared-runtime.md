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

Closed by `PER-14`.

M1 exposes only the options needed to keep the runtime reusable without baking in
Telegram, scheduler, or control-plane assumptions:

- `sessionKey`
- `workspaceRoot`
- `includeWorkspaceResources`
- resource path overrides for tests and explicit callers
- prompt metadata for later frontend-specific annotations

M1 does not expose first-class model, provider, thinking-level, auth, tool
allowlist, memory, persistence, approval, or delivery options. Pi can still
resolve local model/auth settings through its own supported paths, but those are
not part of our public runtime API yet.

Deferred option groups:

- model/provider/thinking selection, when we add operator controls
- tool allowlists, when the tool router and sandbox policy are wired in
- durable session IDs, once the SQLite control plane owns persistence
- memory injection, once the memory milestone defines the contract
- delivery metadata, when Telegram and scheduler frontends are implemented
