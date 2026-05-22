# Execution Status

## Current phase

- active roadmap phase: `v1`
- active milestone: `M3 sandbox foundation`

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| `M0` Repo bootstrap | `complete` | Bun workspace scaffold, Biome, no-emit TypeScript, placeholder apps, and initial packages are in place |
| `M1` Shared runtime | `complete` | Shared runtime API, Pi driver, resource loading, and CLI proof path are in place |
| `M2` Control plane | `complete` | Chat/gateway storage is in place for workspaces, sessions, session-entry trees, and search |
| `M3` Sandbox foundation | `not started` | Docker-first policy is defined |
| `M4` Tool router | `not started` | Depends on M1 and M3 |
| `M5` Telegram gateway | `not started` | Depends on M1, M2, and M4 |
| `M6` Approvals | `not started` | Depends on M2, M4, and M5 |
| `M7` Scheduler | `not started` | Depends on M1, M2, and M5 |
| `M8` Memory | `not started` | Depends on M1 and M2 |
| `M9` Inter-agent | `post-v1` | Deferred to `v2` |
| `M10` Tailscale control surface | `post-v1` | Deferred to `v3` |

## Immediate next steps

1. Implement the Docker-first sandbox executor.
2. Add the host executor boundary for explicitly allowed host actions.
3. Add policy skeletons for routing tools to Docker, host, or pure app execution.

## Update rule

Update this file when milestone state changes.

Do not put detailed scope here. Scope belongs in `ROADMAP.md` and `docs/roadmap/`.
