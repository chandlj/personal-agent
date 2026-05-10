# M2 Control Plane

## Goal

Create the SQLite foundation for workspaces, sessions, transcripts, jobs, approvals, and memory audit metadata.

## Why now

The gateway, scheduler, approvals, and memory system all depend on one durable control plane.

## Dependencies

- [M0 Repo Bootstrap](./M0-repo-bootstrap.md)

## Scope

- implement database bootstrap and migrations
- implement typed repositories in `packages/session-store`
- add the workspace registry
- persist sessions and transcripts
- persist jobs, approvals, and memory audit rows

## Non-goals

- inter-agent mailbox
- external search systems

## Schema/config changes

- `workspaces`
- `sessions`
- `transcripts`
- `transcripts_fts`
- `jobs`
- `job_runs`
- `job_deliveries`
- `approvals`
- `memory_entries`

## Exit criteria

- workspaces and sessions can be created and queried
- transcripts can be stored and searched
- jobs and approvals can be stored

## Open questions

- migration runner packaging
- SQLite connection lifetime per app
