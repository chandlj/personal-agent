# Product Roadmap

## Purpose

This is the canonical roadmap for the repository.

Use it to answer:

- what each phase means
- what is in scope now
- what is explicitly deferred
- what must be true to move to the next phase

Detailed milestone specs live under [roadmap/](./roadmap). Live progress lives in [STATUS.md](./STATUS.md).

## Roadmap principles

- Build vertically, not as disconnected infrastructure slices.
- Keep v1 focused on one useful personal-agent loop.
- Lock architectural decisions in ADRs instead of re-litigating them in milestone docs.
- Treat inter-agent and UI work as explicit later phases, not background assumptions.

## v1

### Goal

Ship a usable personal agent with a shared runtime, Telegram gateway, Docker-first tools, guarded host integrations, durable local memory, and scheduled jobs.

### In scope

- repo bootstrap and shared runtime
- local CLI frontend
- workspace registry with one stable workspace per main chat
- SQLite control plane
- Docker-first sandbox
- tool routing and approvals
- Telegram gateway MVP
- scheduler with fresh sessions
- Hermes-style local memory plus transcript search

### Out of scope

- inter-agent mailbox
- subagent-specific workspaces
- web UI
- Tailscale control surface
- external user-modeling services

### Exit criteria

- Telegram chat can start and continue sessions
- tools run through the intended Docker or host path
- dangerous host actions require approval
- scheduled jobs run in fresh sessions and deliver results
- memory survives across sessions and transcript recall works

### Milestones

- [M0 Repo Bootstrap](./roadmap/M0-repo-bootstrap.md)
- [M1 Shared Runtime](./roadmap/M1-shared-runtime.md)
- [M2 Control Plane](./roadmap/M2-control-plane.md)
- [M3 Sandbox Foundation](./roadmap/M3-sandbox.md)
- [M4 Tool Router](./roadmap/M4-tool-router.md)
- [M5 Telegram Gateway](./roadmap/M5-telegram-gateway.md)
- [M6 Approvals](./roadmap/M6-approvals.md)
- [M7 Scheduler](./roadmap/M7-scheduler.md)
- [M8 Memory](./roadmap/M8-memory.md)

## v1.1

### Goal

Harden the v1 system without widening the product surface too much.

### In scope

- memory review and pruning commands
- transcript-search summarization polish
- better job delivery and memory audit visibility

### Exit criteria

- operator can inspect and prune memory safely
- transcript recall is usable without manual database inspection
- job and approval audit flows are easier to debug

## v2

### Goal

Add coordinated multi-agent work without compromising the v1 boundaries.

### In scope

- inter-agent mailbox
- endpoint registry
- subagent-specific workspaces

### Exit criteria

- one agent can hand work to another reliably
- subagents are isolated by workspace
- cross-process delivery is durable

## v3

### Goal

Expose an operator control surface beyond CLI and Telegram.

### In scope

- web UI
- Tailnet-only control surface via `tailscale serve`

### Exit criteria

- operator can inspect sessions, jobs, approvals, and memory through the UI
- Tailnet exposure does not weaken the auth model

## Locked ADRs

- [ADR-001 Fresh Scheduled Sessions](./decisions/ADR-001-fresh-scheduled-sessions.md)
- [ADR-002 Workspace Model](./decisions/ADR-002-workspace-model.md)
- [ADR-003 Memory Source Of Truth](./decisions/ADR-003-memory-source-of-truth.md)
