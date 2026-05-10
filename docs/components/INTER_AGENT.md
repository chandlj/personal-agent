# Inter-Agent Communication

## Recommendation

Use two communication layers:

1. shared in-process event bus for embedded sessions
2. durable mailbox for cross-process communication

Do not rely on `pi.events` for cross-process messaging. In pi, `pi.events` is an in-process event bus only.

## What pi supports today

Pi already supports:

- `pi.events` for extension-to-extension communication in one process
- `pi.sendUserMessage()` for injecting work into a specific session

This is enough to build a clean inter-agent system if you separate:

- signaling
- delivery
- persistence

## Recommended model

Treat every agent as a logical endpoint with:

- `agentId`
- `sessionId`
- `capabilities`
- `deliveryMode`

Then use a router that decides whether to deliver over:

- in-process bus
- mailbox
- direct session injection

## Layer 1: in-process event bus

Use this when multiple agent sessions are embedded in one runtime process.

### Good use cases

- coordinator agent wakes a scout agent
- local UI listens for agent status updates
- scheduler process hosts multiple live agent sessions in memory

### Recommended pattern

- create one shared `eventBus`
- pass it to every `DefaultResourceLoader`
- keep event payloads small and typed
- use events for signaling, not large data transfer

### Example channels

- `agent:status`
- `agent:task-request`
- `agent:task-progress`
- `agent:task-complete`
- `agent:interrupt`

### Example payload

```ts
type AgentTaskEvent = {
  fromAgentId: string;
  toAgentId: string;
  correlationId: string;
  taskType: "research" | "review" | "implement";
  payload: unknown;
};
```

## Layer 2: durable mailbox

Use this for:

- separate runtime processes
- scheduler to agent communication
- gateway to worker communication
- future remote workers

The mailbox should live in SQLite.

## Mailbox schema

Recommended tables:

### `agent_endpoints`

```text
agent_id
session_id
process_id
runtime_type
status
last_seen_at
capabilities_json
```

### `agent_messages`

```text
id
from_agent_id
to_agent_id
message_type
payload_json
status           -- pending, delivered, acknowledged, failed
correlation_id
created_at
delivered_at
acknowledged_at
error
```

### `agent_subscriptions`

Optional table if you want pub/sub semantics later.

```text
agent_id
channel
created_at
```

## Delivery semantics

Use explicit message kinds.

Examples:

- `task.request`
- `task.accepted`
- `task.progress`
- `task.result`
- `task.error`
- `agent.interrupt`
- `agent.broadcast`

Do not send raw prompts as untyped blobs if you can avoid it.

## How messages reach the target session

Your inter-agent router should translate mailbox messages into one of two things:

### 1. direct session injection

If the target session is alive in the same process:

- call `session.prompt(...)`
- or inject through `pi.sendUserMessage(...)` if going through extension/runtime APIs

### 2. queued delivery

If the target agent is not active:

- leave the message in the mailbox
- let a worker or session host claim it later

This is what makes scheduled and deferred agent work possible.

## Routing API

I recommend one internal service like this:

```ts
interface InterAgentRouter {
  send(message: AgentMessageEnvelope): Promise<void>;
  broadcast(channel: string, payload: unknown): Promise<void>;
  interrupt(agentId: string, reason?: string): Promise<void>;
  registerEndpoint(endpoint: AgentEndpoint): Promise<void>;
  heartbeat(agentId: string): Promise<void>;
}
```

Suggested types:

```ts
type AgentMessageEnvelope = {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: string;
  payload: unknown;
  correlationId?: string;
};

type AgentEndpoint = {
  agentId: string;
  sessionId: string;
  runtimeType: "embedded" | "worker" | "scheduler" | "gateway";
  capabilities: string[];
};
```

## How an agent should be addressed

Do not route only by session.

Use a stable logical `agentId` such as:

- `main`
- `scheduler`
- `telegram-gateway`
- `worker:research`
- `worker:review`

Then map those to current live session IDs through `agent_endpoints`.

This prevents brittle coupling to one ephemeral session file or runtime instance.

## Suggested interaction patterns

### 1. Coordinator and workers

Best for parallel work.

Pattern:

- coordinator sends `task.request`
- worker accepts
- worker sends progress and final result
- coordinator integrates result

### 2. Broadcast status

Best for UI and observability.

Pattern:

- agents emit `agent:status` on in-process bus
- gateway/UI mirrors the same state into the database if needed

### 3. Deferred wake-up

Best for scheduler-driven flows.

Pattern:

- scheduler writes mailbox message
- worker process claims and executes
- result gets written back as a message or normal transcript event

## How to use `pi.sendUserMessage()`

This is the cleanest way to make one agent hand work to another session when the target session is already active.

Recommended convention:

- wrap inter-agent deliveries in a structured system prefix or metadata block
- tell the target that the source is another internal agent, not the human operator

Example injected content:

```text
[INTERNAL TASK from worker:research]
Please summarize the authentication findings from session abc123.
```

Keep this distinct from user-facing messages.

## Suggested extension bridge

Build one pi extension that:

- subscribes to mailbox events relevant to its `agentId`
- injects messages into the local session
- emits progress and completion events back to the router

Suggested file:

```text
extensions/
  inter-agent/
    index.ts
```

Responsibilities:

- read assigned `agentId`
- on `session_start`, register endpoint
- poll or subscribe to router messages
- convert incoming messages to `pi.sendUserMessage()`
- emit status via `pi.events` and mailbox acknowledgements

## Recommended first implementation

Start simple:

### Phase 1

- same-process shared `eventBus`
- direct session injection

### Phase 2

- SQLite mailbox
- endpoint registry
- worker polling loop

### Phase 3

- pub/sub subscriptions
- WebSocket-based broker
- richer interruption and progress semantics

## Practical rule

Use:

- `pi.events` for same-process signals
- `pi.sendUserMessage()` for delivery into a specific live session
- SQLite mailbox for anything cross-process or durable

That is the right abstraction boundary for your harness.
