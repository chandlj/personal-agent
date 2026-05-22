# M4 Tool Router

## Status

Folded into [M3 Runtime Execution Backends](./M3-sandbox.md).

## Decision

Do not build a standalone tool-router package for v1.

The agent runtime owns tool definitions and dispatch. Tools that need shell or filesystem
execution use the configured command backend. Pure app tools such as memory, transcript search,
configuration reads, and approval state transitions stay inside the runtime and do not enter the
command execution layer.

## Rationale

The planned router mostly encoded static facts, such as `bash` using Docker and memory using app
logic. That does not justify a package boundary yet. A separate router can be reintroduced later if
the system needs genuinely dynamic routing by workspace trust, model permission, remote execution,
approval state, or operator policy.
