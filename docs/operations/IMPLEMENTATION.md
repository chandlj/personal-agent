# Implementation Plan

## Goal

Build a focused TypeScript personal agent harness with:

- `pi-coding-agent` as the core runtime
- Telegram as the first messaging gateway
- Docker-default sandboxing with guarded host integrations
- configurable memory
- skills and Markdown resource files
- scheduled jobs

## Delivery strategy

Build in vertical slices, not by infrastructure layer alone.

That means each milestone should produce something that can actually run, even if it is incomplete.

## Canonical roadmap

Roadmap phase ordering now lives in [ROADMAP.md](../ROADMAP.md).

Milestone specs live under [docs/roadmap/](../roadmap/).

This file is the implementation-oriented companion to those docs.

## Milestone 0: Repo bootstrap

### Goal

Create the repo structure and establish the runtime baseline.

### Deliverables

- monorepo initialized
- TypeScript no-emit typecheck setup
- Biome formatter and linter setup
- Bun chosen as package manager and development runtime
- source-native workspace package resolution through `src/index.ts`
- base config loading package
- placeholder apps and packages created

### Suggested tasks

1. Initialize the monorepo
2. Create app folders:
   - `apps/cli`
   - `apps/gateway`
   - `apps/scheduler`
3. Create package folders:
   - `packages/config`
   - `packages/shared`
   - `packages/session-store`
   - `packages/agent-runtime`
   - `packages/sandbox`
   - `packages/tool-router`
   - `packages/gateway-core`
   - `packages/gateway-adapter-telegram`
   - `packages/auth`
4. Add root Bun scripts for check, build-as-typecheck, dev, and start
5. Add Biome scripts for linting, formatting, and CI checks
6. Add base `tsconfig` and workspace config

### Exit criteria

- `bun run build` works as a no-emit typecheck
- all apps typecheck
- config can be loaded in one test command

## Milestone 1: Shared runtime

### Goal

Create one reusable way to start agent sessions.

### Deliverables

- `packages/agent-runtime` wraps `createAgentSession()`
- shared resource loading for skills, prompts, extensions, AGENTS, SYSTEM
- simple CLI command that starts a local session

### Runtime boundary

Apps use `createAgentRuntime({ config })` from `packages/agent-runtime`.

The runtime owns:

- requesting resolved resource roots from `packages/config`
- loading `AGENTS.md`, `SYSTEM.md`, `APPEND_SYSTEM.md`, `skills/`, `prompts/`, and `extensions/`
- adapting resources into `@earendil-works/pi-coding-agent`
- creating Pi sessions through one driver path
- normalizing prompt output/events into runtime-owned types

Frontends pass a resolved workspace root. CLI may explicitly opt into
workspace-local resources; gateway and scheduler should normally rely on global
resources plus their resolved workspace state. Frontends should not import Pi
directly.

The M1 public options are intentionally limited to `sessionKey`,
`workspaceRoot`, `includeWorkspaceResources`, resource path overrides, and prompt
metadata. Model/provider, thinking-level, auth, tool allowlists, memory,
persistence, approvals, and delivery metadata are deferred until the milestones
that own those concerns.

M1 uses in-memory Pi sessions. Durable sessions, transcripts, approvals, jobs,
and memory remain control-plane work for later milestones.

### Suggested tasks

1. Implement `createSession()` in `packages/agent-runtime`
2. Wire `DefaultResourceLoader`
3. Load:
   - `AGENTS.md`
   - `SYSTEM.md`
   - `APPEND_SYSTEM.md`
   - `skills/`
   - `prompts/`
   - `extensions/`
4. Add a minimal CLI command in `apps/cli`
5. Verify prompts can be sent locally

Current local smoke path:

```bash
bun run start:cli -- chat run --cwd . "Summarize docs/roadmap/M1-shared-runtime.md"
```

This requires local Pi auth/model configuration. The non-auth smoke path is:

```bash
bun run start:cli -- --help
```

### Exit criteria

- local CLI can run a prompt
- skills and prompt resources are visible
- one shared runtime path exists for future gateway and scheduler use

## Milestone 2: Persistence and control plane

### Goal

Create the SQLite foundation for workspaces, sessions, transcripts, and jobs.

### Deliverables

- SQLite database initialized
- migrations system in place
- first repository layer implemented

### Suggested tables

- `sessions`
- `workspaces`
- `transcripts`
- `jobs`
- `job_runs`
- `job_deliveries`
- `approvals`
- `memory_entries`

### Suggested tasks

1. Implement DB bootstrap
2. Add migration runner
3. Add repository interfaces
4. Persist:
   - workspace registry
   - session metadata
   - transcript messages
   - basic job definitions

### Exit criteria

- workspaces and sessions can be created and queried
- transcripts can be written and searched by session
- jobs can be stored

## Milestone 3: Sandbox foundation

### Goal

Run file and shell tools through Docker by default.

### Deliverables

- Docker executor
- host executor
- shared sandbox types
- tool routing policy skeleton

### Suggested tasks

1. Implement `docker-executor.ts`
2. Implement `host-executor.ts`
3. Add command timeout and cancellation handling
4. Add basic Docker configuration:
   - image
   - workspace mount
   - working dir
5. Add minimal policy object to classify tool calls

### Exit criteria

- a shell command can be executed in Docker
- a host command can be executed separately
- the system can distinguish Docker vs host execution

## Milestone 4: Tool router

### Goal

Take control of how tools execute.

### Deliverables

- built-in tools overridden or wrapped
- routing logic for Docker, host, and pure app tools
- protected path checks
- approval hook points

### Suggested tasks

1. Override `bash`, `read`, `write`, `edit`
2. Route default filesystem tools to Docker
3. Block protected paths
4. Add audit metadata to tool results
5. Add a small host-only tool example

### Exit criteria

- file and shell tools run in Docker
- host-only tools are distinguishable
- protected paths are blocked

## Milestone 5: Telegram gateway MVP

### Goal

Get a working Telegram-connected agent.

### Deliverables

- generic gateway core
- Telegram adapter using `grammy`
- per-session queueing
- authorization checks
- transcript persistence

### Suggested tasks

1. Implement gateway core types
2. Implement session key generation
3. Implement queue manager
4. Implement Telegram adapter:
   - inbound text
   - replies
   - file downloads
   - outbound messages
5. Enforce `TELEGRAM_ALLOWED_USERS`
6. Persist transcript events

### Exit criteria

- Telegram message reaches the agent
- agent can respond
- messages are persisted
- unauthorized users are denied

## Milestone 6: Approval system

### Goal

Protect host-side dangerous actions.

### Deliverables

- approval records in database
- approval request and resolution flow
- dangerous host command checks

### Suggested tasks

1. Define approval model
2. Detect dangerous host actions
3. Send approval request back through Telegram or CLI
4. Resume execution only if the waiting process is still alive
5. Expire or abandon pending waits on restart and require the action to be retried

### Exit criteria

- dangerous host action is blocked pending approval
- operator can approve or deny
- restart behavior is explicit and best-effort rather than pretending to be durable
- result is audited

## Milestone 7: Scheduler MVP

### Goal

Run scheduled jobs in fresh sessions.

### Deliverables

- scheduler service
- one-shot and recurring jobs
- delivery to origin, home, or file

### Suggested tasks

1. Implement job parsing
2. Use `croner` for recurrence
3. Resolve workspace per job
4. Start fresh session per job
5. Deliver final result via gateway or file
6. Persist run results and delivery attempts

### Exit criteria

- a scheduled Telegram job runs unattended
- result is delivered
- job runs are recorded

## Milestone 8: Memory MVP

### Goal

Add durable, configurable memory without overbuilding.

### Deliverables

- `MEMORY.md`
- `USER.md`
- memory service
- transcript FTS5 search
- transcript search summarization

### Suggested tasks

1. Implement bounded prompt memory rendering
2. Add memory CRUD actions
3. Add duplicate rejection and audit logging
4. Add transcript full-text search
5. Add transcript-search summarization
6. Integrate memory into runtime startup

### Exit criteria

- memory files are loaded into sessions
- memory entries can be updated
- old transcript content can be searched

## Milestone 9: Inter-agent communication

### Goal

Support multiple cooperating agents.

This is post-v1.

### Deliverables

- same-process shared event bus
- SQLite mailbox
- endpoint registration

### Suggested tasks

1. Share one `eventBus` between embedded sessions
2. Add `agent_endpoints` and `agent_messages`
3. Add mailbox polling loop
4. Deliver messages via `pi.sendUserMessage()` into live sessions

### Exit criteria

- one agent can hand off work to another
- cross-process delivery works through mailbox

## Milestone 10: Tailscale-enabled control surface

### Goal

Expose the operator UI safely on your Tailnet.

This is post-v1.

### Deliverables

- local UI or API bound to loopback
- Tailscale Serve integration
- Tailscale-aware UI auth bootstrap

### Suggested tasks

1. Add local UI/API bind mode
2. Add Tailscale config
3. Add CLI helpers for `tailscale serve`
4. Keep API token auth explicit

### Exit criteria

- operator UI is reachable over Tailnet
- direct public exposure is not required
- auth model remains explicit

## Minimal v1 path

If you want the shortest route to something useful, stop after Milestone 8.

That gives you:

- shared pi runtime
- Docker-routed tools
- Telegram gateway
- dangerous-action approvals
- scheduled jobs
- Hermes-style local memory
- persistent state

This is already a very usable personal harness.

## Recommended testing plan

### Per milestone

Every milestone should add at least one integration test.

### Highest-priority tests

1. runtime starts and loads resources
2. Docker tool execution works
3. protected paths are blocked
4. Telegram unauthorized user is denied
5. Telegram authorized user gets a reply
6. dangerous host action pauses for approval
7. scheduler executes a due job
8. transcript search returns expected result

## Recommended sequencing rules

### Do first

- runtime
- persistence
- Docker sandbox
- Telegram gateway
- memory

### Do later

- advanced memory extraction
- Honcho-style modeling
- inter-agent mailbox
- more messaging adapters
- browser operator UI
- Tailscale bootstrap UX

## Concrete next actions

If you are starting immediately, do these first:

1. scaffold the monorepo
2. implement `packages/config`
3. implement `packages/session-store`
4. implement `packages/agent-runtime`
5. prove local CLI prompting works
6. implement Docker executor
7. connect Telegram gateway to the shared runtime

That is the fastest path to real progress.
