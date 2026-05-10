# Docs Index

This directory is organized by purpose:

- top-level docs explain the project and point to canonical sources
- `components/` contains subsystem specs
- `operations/` contains implementation, testing, and runbook material
- `decisions/` contains locked ADRs
- `roadmap/` contains milestone-level plans
- `research/` contains historical design work, source notes, and reviews

## Start Here

1. [OVERVIEW.md](./OVERVIEW.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [STRUCTURE.md](./STRUCTURE.md)
4. [ROADMAP.md](./ROADMAP.md)
5. [components/README.md](./components/README.md)

## Canonical Top-Level Docs

- [OVERVIEW.md](./OVERVIEW.md): what the project is, goals, and v1 boundaries
- [ARCHITECTURE.md](./ARCHITECTURE.md): system-level runtime, storage, and service design
- [STRUCTURE.md](./STRUCTURE.md): repository and package layout
- [ROADMAP.md](./ROADMAP.md): canonical product roadmap and milestone order
- [STATUS.md](./STATUS.md): current execution status

## Component Specs

- [components/README.md](./components/README.md): component map
- [components/AUTH.md](./components/AUTH.md)
- [components/CLI.md](./components/CLI.md)
- [components/CONFIG.md](./components/CONFIG.md)
- [components/GATEWAY.md](./components/GATEWAY.md)
- [components/INTER_AGENT.md](./components/INTER_AGENT.md)
- [components/MEMORY.md](./components/MEMORY.md)
- [components/SANDBOXING.md](./components/SANDBOXING.md)
- [components/SCHEDULER.md](./components/SCHEDULER.md)
- [components/SCHEMA.md](./components/SCHEMA.md)
- [components/TOOLS.md](./components/TOOLS.md)
- [components/TRANSCRIPTS.md](./components/TRANSCRIPTS.md)
- [components/WORKSPACES.md](./components/WORKSPACES.md)

## Operations

- [operations/README.md](./operations/README.md)
- [operations/IMPLEMENTATION.md](./operations/IMPLEMENTATION.md)
- [operations/OPERATIONS.md](./operations/OPERATIONS.md)
- [operations/TESTING.md](./operations/TESTING.md)

## Planning And Decisions

- [decisions/](./decisions/)
- [roadmap/](./roadmap/)
- [ROADMAP.md](./ROADMAP.md)
- [STATUS.md](./STATUS.md)

## Research And History

- [research/README.md](./research/README.md)
- [research/FOUNDATION_RECOMMENDATION.md](./research/FOUNDATION_RECOMMENDATION.md)
- [research/EARLY_DESIGN.md](./research/EARLY_DESIGN.md)
- [research/SPEC_REVIEW.md](./research/SPEC_REVIEW.md)
- [research/SOURCES.md](./research/SOURCES.md)
- [research/FUTURE.md](./research/FUTURE.md)

## Rules

- Put product scope and sequencing in [ROADMAP.md](./ROADMAP.md) and `docs/roadmap/`
- Put locked architecture decisions in `docs/decisions/`
- Put canonical subsystem contracts in `docs/components/`
- Put historical analysis and exploratory material in `docs/research/`
- Do not treat research docs as canonical unless a top-level or component spec says so
