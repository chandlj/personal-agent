# Future Integrations

Roadmap phase ordering now lives in [ROADMAP.md](../ROADMAP.md).

This file is only for future integrations and deferred ideas beyond the currently locked roadmap.

## High-value future additions

These integrations are worth considering after the core harness is stable.

## More messaging adapters

- Slack adapter
- Discord adapter
- Signal adapter
- WhatsApp adapter

The gateway architecture already assumes adapters, so these should be additive rather than structural rewrites.

## Tailscale-enhanced operator UI

- Tailnet-only browser UI via `tailscale serve`
- operator identity bootstrap from Tailscale headers
- remote approvals and monitoring from any device on the Tailnet

This becomes valuable once you have a richer control UI.

## Better memory and recall

### Transcript summarization

Add structured summaries over old sessions so recall can return:

- decision summaries
- timelines
- linked sessions
- extracted action items

### Advanced Hermes-style memory extraction

Hermes has a stronger memory stack than simple Markdown notes:

- curated prompt memory
- FTS5 session search with summarization
- memory persistence nudges
- deeper user modeling via Honcho

The best future integration from that stack is a local memory extraction pipeline:

- scan past transcripts
- extract candidate long-term facts
- classify them as `user`, `environment`, `project`, or `workflow`
- rank them by confidence and recency
- propose or auto-write compact memory entries

This should sit on top of your SQLite transcript store, not replace it.

### Honcho-style user modeling

Hermes integrates Honcho for deeper cross-session user understanding.

That is worth considering later if:

- you use the agent heavily across sessions
- you want preference extraction beyond simple notes
- you are willing to keep this subsystem optional

## Skills automation

- agent-assisted skill creation after successful complex tasks
- skill linting and validation
- skill test harnesses
- skill versioning and publishing

Do this only after manual skills and the basic memory system are reliable.

## MCP integration

- external MCP tool servers
- per-server policy and auth controls
- routing MCP tools to host or Docker based on capability

This becomes useful once your local tool surface grows.

## Rich operator UI

- browser control UI
- transcript browser
- session search UI
- memory editor
- approvals inbox
- scheduled jobs dashboard
- tool audit timeline

## Scheduler upgrades

- job dependencies
- retries and backoff
- event-triggered jobs
- webhook-triggered jobs
- rate-limited or batched delivery

## Host integrations

- AppleScript tools
- notifications
- clipboard integration
- calendar and reminders integrations
- app launchers

These should remain narrowly scoped and approval-gated.

## Optional remote execution later

Even though remote sandboxes are not a priority now, future optional modes could include:

- SSH executor
- remote Docker host
- dedicated worker machine on the Tailnet

Only adopt these if your local Mac becomes too constrained or risky as the sole execution host.

## What to avoid for a long time

- public internet exposure by default
- autonomous self-improving skill loops
- RL and benchmark infrastructure
- broad cloud sandbox support

Those are the fastest path back to Hermes-scale complexity.
