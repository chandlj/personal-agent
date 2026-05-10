# Personal Agent Recommendation

## Short answer

Build your harness on `@mariozechner/pi-coding-agent`, not on Hermes and not on bare `@mariozechner/pi-agent-core`.

Hermes already has most of the product surface you want, but it is large, Python-first, and opinionated in exactly the way you are trying to avoid. `pi-coding-agent` is the better foundation for a smaller TypeScript-native harness because it already gives you:

- an SDK you can embed in your own app
- a strong TypeScript extension system
- skills, prompt templates, AGENTS/SYSTEM files, themes, and TUI hooks
- tool interception and tool replacement
- a reusable session/runtime layer

Use Hermes as a source of product ideas and operating patterns, not as your codebase base layer.

## Recommendation by requirement

| Requirement | Hermes | pi-mono | Recommendation |
|---|---|---|---|
| Extensible tools, extensions, TUI | Strong, but Python-centric and larger than needed | Excellent, first-class in TS | `pi-coding-agent` wins |
| Telegram gateway | Built in | Not built in | Build this yourself on top of pi |
| Robust sandboxing | Built in with multiple backends | Partial examples, not a full product | Reuse pi hooks plus your own hybrid sandbox router |
| Configurable memory | Built in | Must build | Build your own, borrowing Hermes patterns |
| Skills and MD teaching files | Built in | Built in | Tie |
| Cron/scheduled jobs | Built in | Must build | Build your own scheduler service |

## Final recommendation

Use this stack:

- Core harness: `@mariozechner/pi-coding-agent`
- Optional lower-level runtime: `@mariozechner/pi-agent-core` only where you need finer control
- TUI: `@mariozechner/pi-tui`
- Telegram gateway: `grammy`
- Scheduler: `croner`
- State and search: SQLite with `better-sqlite3` and FTS5
- Default sandbox: Docker container
- Host-only sandbox: an explicit host executor guarded by policy plus `@anthropic-ai/sandbox-runtime`

## Why not Hermes as the base?

- It already solves your problems, but it also brings a lot of surface area you explicitly called out as overkill.
- Its gateway, cron, memory, and toolset model are tightly integrated into a much broader system.
- If your goal is to understand and own the harness, you will spend more time carving Hermes down than building a focused TypeScript version on pi.

## What to borrow from Hermes

- one gateway process handling chat platforms and routing
- one scheduler service that wakes the agent in fresh sessions
- a small curated memory layer plus transcript search
- strict execution boundaries between safe default tools and elevated host tools
- delivery targets such as “origin chat” and “home chat”

## First implementation target

Phase 1 should be a local CLI plus Telegram gateway with:

1. `pi-coding-agent` session wrapper
2. Docker-routed file and shell tools
3. host-only tools behind approval and policy
4. Markdown skills and AGENTS/SYSTEM loading
5. SQLite transcript store
6. Croner-backed scheduled jobs

That gets you to a useful personal agent without recreating Hermes wholesale.
