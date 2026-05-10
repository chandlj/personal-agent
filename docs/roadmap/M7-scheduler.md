# M7 Scheduler

## Goal

Run scheduled jobs in fresh sessions attached to a workspace and deliver the result through the normal delivery layer.

## Why now

Scheduling is part of the v1 value proposition and exercises the shared runtime outside the interactive chat loop.

## Dependencies

- [M1 Shared Runtime](./M1-shared-runtime.md)
- [M2 Control Plane](./M2-control-plane.md)
- [M5 Telegram Gateway](./M5-telegram-gateway.md)

## Scope

- implement one-shot and recurring jobs
- resolve workspace per job
- start fresh session per job
- deliver to origin, home, file, or silent target
- record run and delivery history

## Non-goals

- attaching scheduled runs to the live interactive queue
- recursive cron creation by default
- job dependency graphs

## Schema/config changes

- `jobs`
- `job_runs`
- `job_deliveries`

## Exit criteria

- scheduled Telegram jobs run unattended
- results are delivered correctly
- runs are recorded

## Open questions

- concurrency limit defaults
