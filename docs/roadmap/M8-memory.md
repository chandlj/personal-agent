# M8 Memory

## Goal

Add durable local memory modeled on Hermes's file-plus-search design.

## Why now

The agent becomes materially more useful once it can retain compact prompt memory and search older sessions.

## Dependencies

- [M1 Shared Runtime](./M1-shared-runtime.md)
- [M2 Control Plane](./M2-control-plane.md)

## Scope

- implement bounded `MEMORY.md` and `USER.md`
- add `add/replace/remove` memory operations
- mirror memory edits into SQLite audit rows
- use session-entry FTS search for transcript recall
- add lightweight summarization over search hits

## Non-goals

- Honcho-style external modeling
- embeddings
- autonomous extraction from every transcript

## Schema/config changes

- `memory_entries`
- memory size limits

## Exit criteria

- memory files load into sessions
- memory entries can be updated safely
- old session-entry content can be searched and summarized

## Open questions

- default summarization trigger thresholds
