# ADR-002 Workspace Model

## Status

Accepted

## Decision

Each main chat gets one stable workspace.

If subagents are added later, each subagent gets its own isolated child workspace instead of sharing the main workspace directly.

## Rationale

- gives the agent a stable working directory per chat
- keeps project-local overrides deterministic
- creates a clean path to future subagent isolation

## Consequences

- the control plane needs a `workspaces` table
- sessions must resolve a workspace before runtime startup
- downloaded files and local state should live under the workspace tree
