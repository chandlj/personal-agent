# Gateway Design

## Recommendation

Build the gateway as a generic messaging layer with platform adapters.

Telegram should be the first adapter, implemented on `grammy`, but the gateway itself should not be Telegram-specific.

Why `grammy` for the first adapter:

- strong TypeScript fit
- active Telegram Bot API support
- good plugin ecosystem
- clean middleware model

`telegraf` is also viable, but `grammy` is the better fit for a TypeScript-first harness.

## Core principle

The gateway should be a small platform kernel plus adapters.

That means:

- platform-specific code lives only in adapters
- the rest of the system works on canonical inbound and outbound message types
- session routing, queueing, auth, and delivery are shared across platforms

Do not put core memory, tool routing, or scheduler logic into any adapter.

## High-level architecture

```text
gateway/
  core/
    types.ts
    router.ts
    sessions.ts
    queue.ts
    delivery.ts
    auth.ts
    commands.ts
  adapters/
    telegram/
    slack/
    discord/
```

Telegram is just one adapter implementation.

## Responsibilities

The gateway core should do only messaging orchestration:

- receive normalized inbound events from adapters
- map chats to sessions
- manage per-session queueing and cancellation
- route commands
- call the shared agent session wrapper
- persist transcript metadata
- deliver outbound messages through adapters
- enforce authorization and delivery policy

## Canonical models

### Inbound event

Each adapter should convert native events into one internal type:

```ts
type GatewayInboundEvent = {
  platform: "telegram" | "slack" | "discord";
  chatId: string;
  userId: string;
  threadId?: string;
  messageId: string;
  text?: string;
  attachments: GatewayAttachment[];
  timestamp: string;
  raw: unknown;
};
```

### Exact TypeScript interface

```ts
type GatewayPlatform = "telegram" | "slack" | "discord";

type GatewayInboundEvent = {
  platform: GatewayPlatform;
  chatId: string;
  userId: string;
  threadId?: string;
  messageId: string;
  text?: string;
  attachments: GatewayAttachment[];
  timestamp: string;
  raw: unknown;
};
```

### Outbound message

The core should speak one outbound format:

```ts
type GatewayOutboundMessage = {
  platform: string;
  targetChatId: string;
  targetThreadId?: string;
  text: string;
  attachments?: OutboundAttachment[];
  replyToMessageId?: string;
  deliveryMode?: "final" | "status" | "approval";
};
```

### Exact TypeScript interface

```ts
type GatewayDeliveryMode = "final" | "status" | "approval";

type GatewayTarget = {
  platform: GatewayPlatform;
  chatId: string;
  threadId?: string;
};

type GatewayOutboundMessage = {
  platform: GatewayPlatform;
  targetChatId: string;
  targetThreadId?: string;
  text: string;
  attachments?: OutboundAttachment[];
  replyToMessageId?: string;
  deliveryMode?: GatewayDeliveryMode;
};
```

### Attachments

Normalize attachments early:

```ts
type GatewayAttachment = {
  kind: "image" | "audio" | "file";
  localPath: string;
  mimeType?: string;
  originalName?: string;
};
```

### Exact TypeScript interface

```ts
type GatewayAttachment = {
  kind: "image" | "audio" | "file";
  localPath: string;
  mimeType?: string;
  originalName?: string;
};
```

### Example normalization

Telegram photo plus caption:

```text
Message text: "Summarize this screenshot"
Attachment: image/jpeg, file_id=abc123
```

should normalize to:

```json
{
  "platform": "telegram",
  "chatId": "12345",
  "userId": "67890",
  "messageId": "111",
  "text": "Summarize this screenshot",
  "attachments": [
    {
      "kind": "image",
      "localPath": "/Users/josephchandler/.personal-agent/workspaces/telegram/12345/agents/main/files/photo-111.jpg",
      "mimeType": "image/jpeg",
      "originalName": "photo-111.jpg"
    }
  ],
  "timestamp": "2026-04-03T16:00:00Z"
}
```

## Session routing

Do not let each platform invent its own session model.

Use one stable route key shape:

- `agent:main:<platform>:<scope>:<chat_id>`
- optional `:<thread_id>` suffix where needed

Examples:

- `agent:main:telegram:dm:12345`
- `agent:main:telegram:group:-10012345`
- `agent:main:slack:channel:C123`
- `agent:main:discord:thread:998:42`

This keeps memory, scheduler, and transcript storage platform-agnostic.

### Example routing

- Telegram DM from chat `12345` -> `agent:main:telegram:dm:12345`
- Telegram group chat `-10012345` -> `agent:main:telegram:group:-10012345`
- future Discord thread `998/42` -> `agent:main:discord:thread:998:42`

The route key is the stable chat binding.

It is not the same thing as a conversation instance.

For v1:

- the gateway routes inbound messages by stable route key
- one session row is active for a given route key at a time
- `/new` and `/reset` archive the current active session row and create a fresh session row on the same route key and workspace
- scheduled jobs do not attach to the active interactive session row for that route key

## Queueing model

Queue one active run per route key.

Behavior:

- new messages while busy become steering or follow-up messages
- `/stop` cancels the in-flight run
- scheduled jobs do not reuse the live interactive session queue
- scheduled jobs start a fresh run session and only reuse the same delivery adapters
- adapters should not own queue semantics

## Commands

Command parsing should live in gateway core, not in adapters.

Start with:

- `/new`
- `/reset`
- `/stop`
- `/model`
- `/help`

Adapters should only deliver text and metadata. The core decides whether a message is a command, normal prompt, or approval reply.

### Exact TypeScript interface

```ts
type GatewayCommandName =
  | "/new"
  | "/reset"
  | "/stop"
  | "/model"
  | "/help";

type GatewayCommandResult =
  | { kind: "command"; name: GatewayCommandName; args: string[] }
  | { kind: "approval_reply"; approvalId: string; decision: "approve" | "deny" }
  | { kind: "prompt"; text: string };
```

### Example command handling

Inbound Telegram message:

```text
/new continue with the deployment work
```

Expected behavior:

1. Telegram adapter emits normalized event
2. gateway core recognizes `/new`
3. auth checks still run
4. gateway archives the active session row for the current route key if one exists
5. gateway creates a fresh session row bound to the same route key and workspace
6. the trailing prompt text, if any, is sent to the fresh session

## Authorization

Keep authorization generic.

The policy layer should evaluate inputs like:

- `platform`
- `userId`
- `chatId`
- `threadId`
- `isDirectMessage`

Start Telegram with:

- `TELEGRAM_ALLOWED_USERS`
- optional `TELEGRAM_ALLOWED_CHATS`

But implement auth as a shared service so future adapters can use the same decision flow.

## Delivery API

The gateway core should use a generic delivery interface:

- `sendMessage(target, message)`
- `updateMessage(target, messageId, patch)`
- `deleteMessage(target, messageId)`
- `sendTyping(target, enabled)`
- `sendApprovalRequest(target, request)`

Each adapter implements what the underlying platform supports.

### Exact TypeScript interface

```ts
interface GatewayDeliveryAdapter {
  sendMessage(target: GatewayTarget, message: GatewayOutboundMessage): Promise<string | null>;
  updateMessage(target: GatewayTarget, messageId: string, patch: Partial<GatewayOutboundMessage>): Promise<void>;
  deleteMessage(target: GatewayTarget, messageId: string): Promise<void>;
  sendTyping(target: GatewayTarget, enabled: boolean): Promise<void>;
  sendApprovalRequest(
    target: GatewayTarget,
    request: { approvalId: string; prompt: string; details?: string }
  ): Promise<string | null>;
}
```

### Example delivery calls

Final reply:

```ts
sendMessage(
  { platform: "telegram", chatId: "12345" },
  { text: "Done", deliveryMode: "final" }
);
```

Approval request:

```ts
sendApprovalRequest(
  { platform: "telegram", chatId: "12345" },
  { approvalId: "appr_123", prompt: "Allow AppleScript to open Music.app?" }
);
```

## Capability model

Platforms differ. Model that explicitly.

Example capability flags:

```ts
type PlatformCapabilities = {
  supportsThreads: boolean;
  supportsMessageEdit: boolean;
  supportsTyping: boolean;
  supportsVoice: boolean;
  supportsInlineApproval: boolean;
  maxMessageLength: number;
};
```

This keeps the core from assuming Telegram semantics everywhere.

## Telegram as the first adapter

The first adapter should support:

- text
- images
- files
- voice notes
- direct messages
- group chats
- replies

Persist downloaded files under a chat-scoped workspace and pass normalized references into the agent.

### Example usage

User says:

```text
Please review this file and tell me whether it should be committed.
```

with an attached patch file.

Expected flow:

1. adapter downloads the file into the workspace
2. gateway emits a normalized attachment reference
3. session runtime receives the prompt and file reference
4. tool router handles any subsequent reads inside Docker

### Example Telegram approval UX

Approval request message:

```text
Approval required

Action: AppleScript
Request: Allow AppleScript to open Music.app?
Approval ID: appr_123

Reply with:
/approve appr_123
or
/deny appr_123
```

Approval response from operator:

```text
/approve appr_123
```

Expected gateway behavior:

1. adapter normalizes the approval reply
2. gateway core resolves the approval id
3. approval row changes to `approved`
4. blocked tool resumes only if the originating process is still alive and waiting on that approval
5. adapter sends confirmation text back

If the process restarted or the in-memory wait state is gone, the approval row remains as audit history only and the action must be retried.

## Delivery targets

Support generic targets from the start:

- `origin`
- `home`
- `<platform>-chat:<chat_id>`
- `local-file`

For Telegram, that becomes:

- `telegram-home`
- `telegram-chat:<chat_id>`

`home` and `telegram-home` resolve through fixed config in v1.

Do not support an in-chat command that mutates the configured home target.

This makes scheduled jobs and proactive notifications much easier later.

## Tailscale support

If you want to expose a gateway UI or operator control surface to your Tailnet, the right pattern is:

- bind the gateway UI/API to `127.0.0.1`
- publish it through `tailscale serve`
- optionally trust Tailscale identity headers only on that loopback-only UI path

This follows the same basic operational model OpenClaw documents for its gateway.

### Recommended modes

Support these modes:

- `off`: no Tailscale integration
- `serve`: Tailnet-only HTTPS via `tailscale serve`
- `tailnet-bind`: bind directly to the Tailscale IP without Serve

This is a post-v1 control-surface feature. When you build it, `serve` is the best first mode.

### Why `serve` is the preferred mode

It gives you:

- Tailnet-only exposure
- HTTPS handled by Tailscale
- MagicDNS naming
- optional identity headers for the operator UI
- no need to bind the gateway broadly

### Trust boundary

Only trust Tailscale headers when:

- the gateway listens on loopback only
- the request is arriving through local Tailscale Serve proxying
- the same endpoint is not also reachable directly from LAN or public interfaces

Do not trust these headers on a directly exposed socket.

### Recommended auth split

Use Tailscale only for the browser UI bootstrap path.

Keep:

- UI bootstrap: optional Tailscale identity acceptance
- API endpoints: explicit token auth
- WebSocket control channel: explicit token or UI-issued session token
- messaging adapters: their own platform authorization

This keeps the trust model understandable.

### Suggested config shape

```json
{
  "gateway": {
    "bind": "loopback",
    "uiPort": 18789,
    "tailscale": {
      "mode": "serve",
      "hostname": "personal-agent"
    }
  },
  "auth": {
    "uiMode": "token",
    "apiMode": "token",
    "allowTailscaleUi": true
  }
}
```

### Suggested CLI lifecycle

Later add:

- `personal-agent gateway tailscale up`
- `personal-agent gateway tailscale down`
- `personal-agent gateway tailscale status`

These can manage `tailscale serve` configuration for the UI port.

### Scope recommendation

Treat Tailscale as a control-plane exposure feature, not as a substitute for:

- gateway auth
- host-tool approvals
- sandbox boundaries
- messaging platform allowlists

## Suggested file layout

```text
~/.personal-agent/
  gateway/
    telegram/
      downloads/
  workspaces/
    telegram/
      <chat_id>/
        agents/
          main/
            files/
          <agent_id>/
            files/
```

## What not to do

- do not leak `grammy` types outside the Telegram adapter
- do not store platform-native payloads as your main transcript schema
- do not make scheduler or memory call Telegram APIs directly
- do not duplicate queue and command logic per platform

## Nice-to-have later

- voice transcription
- message edit streaming
- inline approval prompts for host tools
- per-chat model overrides
- Slack and Discord adapters
