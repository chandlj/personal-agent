# Execution Status

## Current phase

- active roadmap phase: `v1`
- active milestone: `M3 runtime execution backends`

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| `M0` Repo bootstrap | `complete` | Bun workspace scaffold, Biome, no-emit TypeScript, placeholder apps, and initial packages are in place |
| `M1` Shared runtime | `complete` | Shared runtime API, Pi driver, resource loading, and CLI proof path are in place |
| `M2` Control plane | `complete` | Chat/gateway storage is in place for workspaces, sessions, session-entry trees, and search |
| `M3` Runtime execution backends | `in progress` | Docker and guarded local command backends are moving into agent-runtime |
| `M4` Tool router | `folded into M3` | Runtime-owned tool dispatch replaces a separate router package |
| `M5` Telegram gateway | `not started` | Depends on M1, M2, and M3 |
| `M6` Approvals | `not started` | Depends on M2, M3, and M5 |
| `M7` Scheduler | `not started` | Depends on M1, M2, and M5 |
| `M8` Memory | `not started` | Depends on M1 and M2 |
| `M9` Inter-agent | `post-v1` | Deferred to `v2` |
| `M10` Tailscale control surface | `post-v1` | Deferred to `v3` |

## Immediate next steps

1. Finish the agent-runtime command backend implementation.
2. Wire runtime tool handlers to the configured command backend.
3. Add approval hook points for local host actions and destructive command patterns.

## Update rule

Update this file when milestone state changes.

Do not put detailed scope here. Scope belongs in `ROADMAP.md` and `docs/roadmap/`.
