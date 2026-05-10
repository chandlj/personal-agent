# Repository Structure

## Purpose

This document defines the intended repository and package layout for Personal Agent.

It should answer:

- how the repo is organized
- which top-level apps and packages exist to support the architecture
- which parts of the structure are core to the system
- which parts are reserved or deferred rather than immediate build requirements

This is a structure document, not a milestone plan. It describes the intended shape of the codebase, while [ROADMAP.md](./ROADMAP.md) defines sequencing and scope.

## Structural Principles

- keep the gateway and execution model shareable across entrypoints
- isolate long-running system roles clearly
- keep platform-specific code separate from shared system code
- avoid turning the repo layout into a commitment to build every package immediately
- reserve space for likely future growth without pretending it already exists

## Top-Level Layout

```text
personal-agent/
  apps/
  packages/
  skills/
  prompts/
  extensions/
  docs/
```

## Core Areas

### `apps/`

Application entrypoints and long-running hosts.

Expected core apps:

- `apps/gateway/`
- `apps/cli/`
- `apps/scheduler/`

Reserved but deferred:

- `apps/web-ui/`

The gateway is the central always-on application. CLI provides local operator access. Scheduler provides background execution. A web UI may exist later, but it is not required to validate the core system.

### `packages/`

Shared implementation units used by the apps.

Expected core packages:

- `packages/agent-runtime/`
- `packages/gateway-core/`
- `packages/gateway-adapter-telegram/`
- `packages/session-store/`
- `packages/scheduler-core/`
- `packages/config/`
- `packages/auth/`

Likely but still flexible packages:

- `packages/memory/`
- `packages/sandbox/`
- `packages/tool-router/`
- `packages/shared/`

The purpose of `packages/` is to keep the architecture modular enough to support gateway, local operator entrypoints, and scheduler without duplicating system logic. It is not necessary for every possible package boundary to be fully realized immediately.

### `skills/`, `prompts/`, `extensions/`

These directories hold agent-facing customization resources rather than core system services.

Recommended meaning:

- `skills/`: reusable skills and specialized instructions
- `prompts/`: prompt templates and reusable prompt inputs
- `extensions/`: runtime extensions and integrations

These should remain structurally separate from core application code.

### `docs/`

Engineering, architecture, and planning documentation.

The current docs hierarchy is:

```text
docs/
  README.md
  OVERVIEW.md
  ARCHITECTURE.md
  ROADMAP.md
  STATUS.md
  STRUCTURE.md
  components/
  operations/
  research/
  roadmap/
  decisions/
```

Use:

- top-level docs for orientation and cross-cutting references
- `components/` for subsystem contracts
- `operations/` for implementation and runbook material
- `research/` for historical and non-canonical material
- `roadmap/` for milestone specs
- `decisions/` for ADRs

## App-Level Structure

### `apps/gateway/`

The always-on host for inbound and outbound communication.

Suggested contents:

```text
apps/gateway/
  src/
    index.ts
    server.ts
    routes/
    websocket/
```

### `apps/cli/`

Local operator entrypoint for direct usage and administration.

Suggested contents:

```text
apps/cli/
  src/
    index.ts
    commands/
```

### `apps/scheduler/`

Background execution host for scheduled and follow-up work.

Suggested contents:

```text
apps/scheduler/
  src/
    index.ts
    worker.ts
```

### `apps/web-ui/`

Reserved for a later operator surface.

This should remain clearly marked as deferred so that its presence in the repository structure is not misread as a current build priority.

## Package-Level Structure

### Core shared packages

#### `packages/agent-runtime/`

Common execution layer used by the system regardless of how work arrived.

#### `packages/gateway-core/`

Shared gateway-facing abstractions, routing, and delivery coordination.

#### `packages/gateway-adapter-telegram/`

Telegram-specific adapter code kept separate from gateway-core.

#### `packages/session-store/`

Persistence layer for sessions, transcripts, jobs, approvals, workspace state, and related metadata.

#### `packages/scheduler-core/`

Shared scheduler logic used by the scheduler host.

#### `packages/config/`

Typed configuration loading and validation.

#### `packages/auth/`

Authentication and approval policy logic.

### Likely support packages

#### `packages/memory/`

Memory-specific logic and retrieval behavior, if it becomes substantial enough to merit a dedicated package.

#### `packages/sandbox/`

Execution backends and sandbox enforcement, if those concerns need to be isolated concretely.

#### `packages/tool-router/`

Tool classification and routing, if that boundary becomes clearer as implementation proceeds.

#### `packages/shared/`

Truly cross-cutting shared types or utilities, if needed. This should stay small and should not become a dumping ground.

## Outside-Repo State Layout

Runtime state should live outside the source tree.

Suggested home layout:

```text
~/.personal-agent/
  config.json
  .env
  memories/
    MEMORY.md
    USER.md
  state/
    state.db
  gateway/
    telegram/
      downloads/
  workspaces/
    telegram/
      <chat_id>/
        agents/
          main/
          <agent_id>/
```

This keeps source code, durable state, and runtime-generated workspace data separate.

## Rules

- structural placeholders should be clearly marked as deferred when they are not current build priorities
- repo structure should support the architecture, not pre-commit the implementation to every future subsystem
- platform-specific code should stay isolated from shared system logic
- operational state should stay out of the repository

## Related Docs

Read next:

1. [ARCHITECTURE.md](./ARCHITECTURE.md)
2. [ROADMAP.md](./ROADMAP.md)
3. [components/README.md](./components/README.md)
