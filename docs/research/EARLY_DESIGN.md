# High-Level Design

## Architecture

```text
Telegram
  |
  v
[grammy gateway]
  |
  v
[chat/session controller] ---> [SQLite state + transcript store]
  |                                   |
  |                                   +--> workspace registry
  |                                   +--> memory metadata
  |                                   +--> scheduled jobs
  |                                   +--> session search
  |
  v
[pi-coding-agent session wrapper]
  |
  +--> [workspace resolver]
  |      +--> stable workspace per main agent/chat
  |      +--> isolated workspace per subagent
  |
  +--> [resource loader]
  |      +--> AGENTS.md
  |      +--> SYSTEM.md / APPEND_SYSTEM.md
  |      +--> skills
  |      +--> prompts
  |      +--> extensions
  |
  +--> [tool router]
         |
         +--> [docker executor] --> Docker container --> mounted workspace
         |
         +--> [host executor]
                +--> policy engine
                +--> approval gate
                +--> sandbox-runtime


[scheduler service]
  |
  +--> loads jobs from SQLite
  +--> starts fresh pi session
  +--> delivers output to Telegram or local files


[local CLI/TUI]
  |
  +--> same session wrapper
  +--> same resource loader
  +--> same tool router
```

## Main design decisions

### 1. One runtime, many frontends

Do not let Telegram, CLI, and scheduler each invent their own agent wiring.

All of them should call the same session wrapper around `createAgentSession()`.

### 2. Tool routing is a first-class subsystem

Do not bury sandbox logic inside one bash tool.

The system should decide execution target before tool execution so that:

- file tools stay in Docker
- host tools stay narrow and auditable
- future frontends behave the same way

### 3. Memory is split between prompt memory and searchable history

This keeps the prompt small while still giving you long-term recall.

### 4. Scheduler runs fresh sessions

Cron jobs should not reuse a live interactive session.

Fresh sessions are easier to reason about, easier to debug, and safer.

## Suggested package layout

```text
personal-agent/
  apps/
    cli/
      src/
    gateway/
      src/
    scheduler/
      src/
  packages/
    agent-runtime/
      src/
        create-session.ts
        system-prompt.ts
        resources.ts
    tool-router/
      src/
        router.ts
        policies.ts
        approvals.ts
    sandbox/
      src/
        docker-executor.ts
        host-executor.ts
        sandbox-runtime.ts
    memory/
      src/
        memory-service.ts
        transcript-search.ts
    session-store/
      src/
        db.ts
        workspaces.ts
        sessions.ts
        jobs.ts
        job-deliveries.ts
        memory.ts
    gateway-core/
      src/
        types.ts
        router.ts
        queue.ts
        delivery.ts
    gateway-adapter-telegram/
      src/
        bot.ts
        updates.ts
        delivery.ts
    scheduler-core/
      src/
        scheduler.ts
        triggers.ts
```

## Core flows

### Telegram message flow

1. Telegram update arrives in `grammy`
2. gateway normalizes message, attachments, and chat identity
3. chat controller resolves or creates the session and workspace
4. session wrapper builds the pi session with current resources
5. agent emits tool calls
6. tool router sends calls to Docker or host
7. results stream back through the gateway
8. final message and transcript are persisted

### Scheduled job flow

1. scheduler loads due jobs from SQLite
2. it resolves the target workspace, then starts a fresh session with the same resource loader
3. it injects the scheduled prompt plus any configured skill context
4. output is delivered to Telegram home chat, origin chat, or file through the normal gateway delivery path
5. run metadata and next run time are saved

## Recommended implementation order

### Phase 1

- shared session wrapper
- Docker-routed shell and file tools
- local CLI entrypoint
- Telegram gateway MVP

### Phase 2

- SQLite state store
- memory service
- FTS5 transcript search
- scheduled jobs

### Phase 3

- inter-agent mailbox
- richer TUI customization
- host integration tools
- approval UX
- skill/package management commands

## Bottom line

The right design is not “rebuild Hermes in TypeScript”.

The right design is:

- use pi as the agent shell and extension platform
- use your own services for Telegram, memory, scheduling, and sandbox policy
- copy Hermes only where it already solved a product problem well
