# Execution Status

## Current phase

- active roadmap phase: `v1`
- active milestone: `M1 shared runtime`

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| `M0` Repo bootstrap | `complete` | Bun workspace scaffold, Biome, no-emit TypeScript, placeholder apps, and initial packages are in place |
| `M1` Shared runtime | `next` | Depends on scaffold |
| `M2` Control plane | `not started` | Schema and workspace model are defined |
| `M3` Sandbox foundation | `not started` | Docker-first policy is defined |
| `M4` Tool router | `not started` | Depends on M1 and M3 |
| `M5` Telegram gateway | `not started` | Depends on M1, M2, and M4 |
| `M6` Approvals | `not started` | Depends on M2, M4, and M5 |
| `M7` Scheduler | `not started` | Depends on M1, M2, and M5 |
| `M8` Memory | `not started` | Depends on M1 and M2 |
| `M9` Inter-agent | `post-v1` | Deferred to `v2` |
| `M10` Tailscale control surface | `post-v1` | Deferred to `v3` |

## Immediate next steps

1. Implement the shared Pi runtime wrapper.
2. Prove local CLI prompting works through the shared runtime.
3. Implement the workspace-aware SQLite control plane.

## Update rule

Update this file when milestone state changes.

Do not put detailed scope here. Scope belongs in `ROADMAP.md` and `docs/roadmap/`.
