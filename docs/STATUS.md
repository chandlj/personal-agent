# Execution Status

## Current phase

- active roadmap phase: `v1`
- active milestone: `M2 control plane`

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| `M0` Repo bootstrap | `complete` | Bun workspace scaffold, Biome, no-emit TypeScript, placeholder apps, and initial packages are in place |
| `M1` Shared runtime | `complete` | Shared runtime API, Pi driver, resource loading, and CLI proof path are in place |
| `M2` Control plane | `in progress` | Scope narrowed to chat/gateway storage: workspaces, sessions, session entries, and search |
| `M3` Sandbox foundation | `not started` | Docker-first policy is defined |
| `M4` Tool router | `not started` | Depends on M1 and M3 |
| `M5` Telegram gateway | `not started` | Depends on M1, M2, and M4 |
| `M6` Approvals | `not started` | Depends on M2, M4, and M5 |
| `M7` Scheduler | `not started` | Depends on M1, M2, and M5 |
| `M8` Memory | `not started` | Depends on M1 and M2 |
| `M9` Inter-agent | `post-v1` | Deferred to `v2` |
| `M10` Tailscale control surface | `post-v1` | Deferred to `v3` |

## Immediate next steps

1. Align the initial Drizzle migration with the narrowed M2 schema.
2. Implement workspace, session, and session-entry repositories.
3. Wire gateway/CLI persistence through the session-store package.

## Update rule

Update this file when milestone state changes.

Do not put detailed scope here. Scope belongs in `ROADMAP.md` and `docs/roadmap/`.
