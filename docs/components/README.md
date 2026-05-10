# Component Specs

This folder contains the canonical subsystem contracts for the project.

Use these docs when you need implementation-facing detail.

## Component Map

- [AUTH.md](./AUTH.md): authentication, authorization, and risky-action approval model
- [CLI.md](./CLI.md): local CLI and TUI behavior
- [CONFIG.md](./CONFIG.md): configuration surfaces and precedence
- [GATEWAY.md](./GATEWAY.md): inbound routing, commands, queueing, and outbound delivery
- [INTER_AGENT.md](./INTER_AGENT.md): post-v1 inter-agent design
- [MEMORY.md](./MEMORY.md): prompt memory and transcript recall
- [SANDBOXING.md](./SANDBOXING.md): Docker-first and host execution boundaries
- [SCHEDULER.md](./SCHEDULER.md): scheduled jobs and fresh-run delivery
- [SCHEMA.md](./SCHEMA.md): SQLite control-plane schema
- [TOOLS.md](./TOOLS.md): tool routing and execution classes
- [TRANSCRIPTS.md](./TRANSCRIPTS.md): normalized transcript event model
- [WORKSPACES.md](./WORKSPACES.md): stable workspace resolution and lifecycle

## Ownership Rules

- top-level docs explain the system
- component docs define contracts
- ADRs lock decisions when needed
- roadmap docs define order and scope

## Suggested Reading Order

1. [GATEWAY.md](./GATEWAY.md)
2. [WORKSPACES.md](./WORKSPACES.md)
3. [SCHEMA.md](./SCHEMA.md)
4. [SANDBOXING.md](./SANDBOXING.md)
5. [MEMORY.md](./MEMORY.md)
