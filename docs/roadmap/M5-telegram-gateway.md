# M5 Telegram Gateway

## Goal

Get a working Telegram-connected agent on top of the generic gateway core.

## Why now

This is the first real end-user surface and validates the architecture.

## Dependencies

- [M1 Shared Runtime](./M1-shared-runtime.md)
- [M2 Control Plane](./M2-control-plane.md)
- [M4 Tool Router](./M4-tool-router.md)

## Scope

- implement gateway core types and queueing
- implement Telegram adapter on `grammy`
- authorize users via allowlist
- download attachments into the chat workspace
- persist transcript events

## Non-goals

- more messaging adapters
- browser UI

## Schema/config changes

- Telegram auth config
- chat-to-workspace/session mapping

## Exit criteria

- Telegram messages reach the agent
- the agent can respond
- unauthorized users are denied
- transcripts are persisted

## Open questions

- message streaming strategy for status updates
