# ADR-003 Memory Source Of Truth

## Status

Accepted

## Decision

`MEMORY.md` and `USER.md` are the canonical prompt-memory stores.

`memory_entries` in SQLite is a structured mirror and audit trail written by the memory service when those files change.

## Rationale

- keeps memory human-editable
- matches the Hermes local memory model more closely
- avoids ambiguity about whether files or rows are authoritative

## Consequences

- memory writes must update files first
- the database mirror must stay synchronized
- future advanced memory systems must layer on top instead of replacing the core files silently
