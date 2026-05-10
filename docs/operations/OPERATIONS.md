# Operations Guide

## Purpose

This is the local runbook for operating the personal agent in development and early self-hosted use.

## Prerequisites

- Bun `1.3.10` or newer
- Docker Desktop or compatible local Docker runtime
- SQLite available through the application bundle
- Telegram bot token for gateway work

## Runtime state locations

- config: `~/.personal-agent/config.json`
- env: `~/.personal-agent/.env`
- database: `~/.personal-agent/state/state.db`
- memories: `~/.personal-agent/memories/`
- downloads: `~/.personal-agent/gateway/telegram/downloads/`
- workspaces: `~/.personal-agent/workspaces/`
- logs: `~/.personal-agent/logs/`

## Local startup order

### Shared dev flow

1. install dependencies with `bun install`
2. run migrations
3. typecheck with `bun run check`
4. lint or format with `bun run lint`, `bun run ci`, `bun run format`, or `bun run fix`
5. run the full typecheck alias with `bun run build`
6. start the CLI, gateway, or scheduler with `bun run dev:cli`, `bun run dev:gateway`, or `bun run dev:scheduler`

### Telegram flow

1. ensure the database exists and migrations are current
2. ensure Docker is available
3. ensure `TELEGRAM_BOT_TOKEN` and allowlists are configured
4. start the gateway

### Scheduler flow

1. ensure the database exists and migrations are current
2. ensure workspaces referenced by jobs are valid
3. start the scheduler

## Backup and restore

### Backup

At minimum, back up:

- `state.db`
- `memories/`
- `workspaces/`

### Restore

Restore in this order:

1. config and env
2. `state.db`
3. `memories/`
4. `workspaces/`

## Logs and debugging

Keep logs structured enough to answer:

- which session handled a message
- which workspace was used
- which tool target executed a call
- whether approval was required
- whether a scheduled run delivered successfully

## Operational safeguards

- never expose the control plane publicly by default
- keep host integrations narrow
- verify Docker availability before accepting tool-heavy sessions
- fail closed on auth and approval checks

## v1 runbook gaps

The following can be added later if needed:

- automated backup tooling
- health-check endpoints
- one-command local orchestrator
- Tailnet control-plane procedures
