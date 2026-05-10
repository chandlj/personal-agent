# System Architecture

## Purpose

This document is the authoritative top-level technical model of the system.

It should explain:

- the major architectural building blocks
- the top-level relationships between them
- the difference between direct interaction and background execution
- how always-on behavior shapes the system
- which lower-level docs are authoritative for detailed contracts

> [!NOTE]
> **@joe**: Is purpose necessary? Seems like that was more for whoever wrote this as a guide than a later reader


## Core Model

Personal Agent is centered around an always-on gateway that receives and coordinates work, plus a shared execution layer where agent work actually happens.

The system is not purely request-driven and not purely event-driven. It supports both:

- direct interaction through operator-facing entrypoints
- background execution through scheduled and follow-up work

The most important architectural distinction is between direct interaction and background execution. The system must support both cleanly without collapsing them into the same mental model.

> [!NOTE]
> **@joe**: The request-driven section and the distinction section seem unnecessary. The high-level idea is that its an always-on gateway that receives messages and coordinates work to the shared runtime. The runtime has subsystems for memory, tool execution, sandboxing, and more. Various entrypoints (message apps, CLI, TUI) interact with the gateway.

## High-Level Building Blocks

### Gateway

The gateway is the architectural center of the system.

It is the always-on entrypoint and orchestration layer for inbound and outbound communication. It receives incoming interactions, normalizes them into the system's internal model, routes work into the shared execution layer, and coordinates replies, follow-up behavior, and delivery back out to the user-facing surface.

The gateway should remain platform-generic at the architectural level, even if Telegram is the primary always-on implementation in v1.

> [!NOTE]
> **@joe**: Get rid of the last paragraph


### Shared Execution Layer

The shared execution layer is where actual agent work happens.

It should provide one common runtime model regardless of how work entered the system. Whether a task begins through a direct interaction or a background trigger, agent execution should happen through the same core session model rather than through separate frontend-specific logic paths.

### Operator Entrypoints

Local operator entrypoints provide direct access to the system outside the always-on gateway surface.

These include CLI and TUI style interaction paths. They are important parts of the architecture, but they are not the center of the always-on system in the same way the gateway is.

### Scheduler

The scheduler is a separate long-running subsystem in concept, even if it may be colocated in deployment.

Its role is to trigger background work, create or resume the appropriate execution path, and hand results back through the system's normal delivery mechanisms. It should not be treated as a special-case extension of the gateway or as a separate agent architecture.

### Local System Database

The local system database stores durable system state.

At a high level, this includes:

- session and transcript state
- workspace and job metadata
- approval records
- delivery audit data
- structured memory metadata

This is storage infrastructure, not the same thing as memory.

### Memory

Memory is a separate architectural concern from storage.

The system's memory model exists to create continuity and understanding over time. It is built from explicit long-term memory, searchable history, and later reflective capabilities. Some of its data is persisted in files and in the local system database, but memory should not be reduced to “whatever is stored in SQLite.”

## Relationship Diagram

```text
operator entrypoints          scheduled/background triggers
        |                                |
        v                                v
                     [ gateway ]
                          |
                          v
              [ shared execution layer ]
                    |               |
                    |               +--> [ memory ]
                    |
                    +--> [ local system database ]
```

## Direct Interaction vs Background Execution

Direct interaction is the primary mode of use.

The system should support live operator interaction through always-on and local entry surfaces, with strong continuity across sessions and enough shared state to make the agent feel persistent rather than stateless.

Background execution exists to extend that interaction model over time.

Scheduled jobs and future follow-up work allow the system to continue operating when there is no live conversation in progress. That background behavior should use the same overall architecture rather than becoming a disconnected subsystem with its own separate logic model.

## Logical Model vs Deployment Model

Logically, the architecture is centered on the gateway, the shared execution layer, memory, and the local system database, with scheduler and operator entrypoints connecting into that core.

Operationally, those pieces may be deployed as separate long-running services, colocated services, or a mix depending on the needs of the system. The architecture should leave room for that flexibility without obscuring the logical ownership of each subsystem.

Always-on behavior matters at this level because it shapes the gateway's role, the scheduler's role, and the persistence model. Even when deployment details vary, the system should still be understood as an always-available gateway-centered agent with supporting local and background execution paths.

## Authority Map

This document is the top-level architectural reference.

Use the following docs for detailed ownership:

- [components/GATEWAY.md](./components/GATEWAY.md): routing, commands, queueing, and delivery
- [components/CLI.md](./components/CLI.md): local operator interaction surfaces
- [components/SCHEDULER.md](./components/SCHEDULER.md): scheduled jobs and background execution behavior
- [components/WORKSPACES.md](./components/WORKSPACES.md): workspace model
- [components/SCHEMA.md](./components/SCHEMA.md): database schema and durable data model
- [components/MEMORY.md](./components/MEMORY.md): long-term memory and recall model
- [components/SANDBOXING.md](./components/SANDBOXING.md): execution boundary details
- [ROADMAP.md](./ROADMAP.md): milestone order and scope
- [STRUCTURE.md](./STRUCTURE.md): repository and package layout

## Related Docs

Read next:

1. [STRUCTURE.md](./STRUCTURE.md)
2. [components/README.md](./components/README.md)
3. [ROADMAP.md](./ROADMAP.md)
