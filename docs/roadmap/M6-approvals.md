# M6 Approvals

## Goal

Protect dangerous host-side actions with an explicit approval flow.

## Why now

Host integrations are in scope for v1, so the safety boundary has to be real before they are used routinely.

## Dependencies

- [M2 Control Plane](./M2-control-plane.md)
- [M4 Tool Router](./M4-tool-router.md)
- [M5 Telegram Gateway](./M5-telegram-gateway.md)

## Scope

- define the approval model
- detect dangerous host actions
- route approval requests through CLI or Telegram
- resume execution only while the waiting process is still alive
- record approvals durably but treat continuation as best-effort

## Non-goals

- browser approvals inbox

## Schema/config changes

- `approvals`
- approval timeout config

## Exit criteria

- dangerous host actions block pending approval
- operator can approve or deny
- restart behavior is explicit: approvals stay recorded, but abandoned waits must be retried
- decisions are audited

## Open questions

- approval expiration policy
