# M2 Control Plane

## Goal

Create the SQLite foundation required for chat and gateway usage: workspace resolution, active session routing, and durable session-entry history.

## Why now

The Telegram gateway needs a durable way to resolve each chat to a stable workspace, find the active session for that route, and persist the conversation history produced by the runtime.

Pi models conversation history as an append-only tree of session entries. M2 should preserve that shape in a runtime-neutral way so `/tree`, `/fork`, `/clone`, and rewind-style navigation can be supported later without flattening the history into a simple message list.

## Dependencies

- [M0 Repo Bootstrap](./M0-repo-bootstrap.md)

## Scope

- implement database bootstrap and migrations
- implement typed repositories in `packages/session-store`
- add the workspace registry
- persist session metadata and active-session lifecycle
- persist session entries as a tree with runtime-neutral metadata
- add full-text search over searchable session-entry text

## Non-goals

- scheduled jobs and delivery audit rows
- approval request/resolution audit rows
- memory audit rows
- inter-agent mailbox
- external search systems

## Schema/config changes

- `workspaces`
- `sessions`
- `session_entries`
- `session_entries_fts`

## Exit criteria

- workspaces and sessions can be created and queried
- only one active session exists per route key
- session entries can be appended with parent-child relationships
- the active leaf can be moved to support branch/rewind semantics
- searchable entry text can be queried by session

## Open questions

- migration runner packaging
- SQLite connection lifetime per app
- exact runtime-neutral entry type names
