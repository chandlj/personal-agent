# M0 Repo Bootstrap

## Goal

Create the repository structure and establish the TypeScript runtime baseline.

## Why now

Every later milestone depends on a stable workspace, build, and package layout.

## Dependencies

- none

## Scope

- initialize the monorepo
- choose package manager and workspace config
- add root check, build-as-typecheck, and dev scripts
- create `apps/cli`, `apps/gateway`, and `apps/scheduler`
- create the initial shared packages

## Non-goals

- implementing the runtime
- implementing the database
- implementing the gateway

## Schema/config changes

- initial config loader only

## Exit criteria

- repo typechecks
- all placeholder apps typecheck
- config loads in one test command

## Open questions

- package manager choice
- lint/test stack choice
