# M4 Tool Router

## Goal

Take control of tool execution so the runtime can route calls to Docker, host, or pure app logic.

## Why now

The sandbox is not useful until the runtime can actually classify and redirect tools.

## Dependencies

- [M1 Shared Runtime](./M1-shared-runtime.md)
- [M3 Sandbox Foundation](./M3-sandbox.md)

## Scope

- override built-in tools such as `bash`, `read`, `write`, and `edit`
- route default filesystem tools to Docker
- block protected paths
- add approval hook points
- attach audit metadata to tool results

## Non-goals

- full operator approval UX
- advanced host automation catalog

## Schema/config changes

- protected path config
- host tool allowlist config

## Exit criteria

- file and shell tools run through the intended target
- protected paths are blocked
- host-only tools are clearly distinguishable

## Open questions

- exact set of overridden built-ins in v1
