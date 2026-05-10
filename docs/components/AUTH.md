# Authentication And Authorization

## Recommendation

Split security into three distinct layers:

1. messaging platform authorization
2. gateway UI and API authentication
3. dangerous host action approval

Do not merge these into one mechanism.

## Messaging platform authorization

For Telegram and future adapters, start with explicit allowlists.

Examples:

- `TELEGRAM_ALLOWED_USERS`
- `SLACK_ALLOWED_USERS`
- `DISCORD_ALLOWED_USERS`

This matches the strongest reusable Hermes pattern: deny by default and only allow known operators.

### Optional future pairing flow

Hermes has a good DM pairing design that is worth adopting later:

- unknown user sends a DM
- bot returns a short pairing code
- operator approves that code locally
- approval is persisted per platform

This is useful when you add more collaborators and do not want to manually collect IDs first.

For v1, plain allowlists are enough.

## Gateway UI and API auth

The browser UI and API should have their own auth layer.

Recommended modes:

- `token`
- `password`
- `tailscale`

### Token mode

Best default.

Use:

- static operator token for bootstrap
- short-lived session token after login
- explicit token checks on API and WebSocket routes

### Password mode

Only for simple shared-secret deployments.

Prefer token mode for normal use.

### Tailscale mode

Use this only when:

- the gateway binds to loopback only
- `tailscale serve` is in front of it
- the UI is Tailnet-only

In this mode, the UI bootstrap can trust Tailscale identity headers.

Do not let this replace explicit API auth everywhere.

## Dangerous host action approval

Approval is separate from authentication.

Authentication answers:

- who can use the system

Approval answers:

- which risky action is allowed right now

This should cover:

- host shell commands
- AppleScript execution
- destructive host filesystem actions
- secret-revealing tools

Hermes’s dangerous command approval model is worth copying here.

For v1, treat approval continuation as best-effort rather than durable workflow state.

That means:

- approval records are durable
- operator decisions are durable
- blocked tool continuations are in-memory only
- if the waiting process disappears, the action must be retried

## Recommended auth matrix

| Surface | Auth model | Notes |
|---|---|---|
| Telegram bot | platform allowlist | pairing can be added later |
| Future Slack/Discord | platform allowlist | same shared policy engine |
| Local browser UI | token | best default |
| Tailnet browser UI | Tailscale bootstrap plus token session | trust only behind Serve |
| API routes | token | keep explicit |
| WebSocket control | token or UI-issued session token | do not rely on raw headers |
| Dangerous host tools | approval layer | separate from auth |

## Tailscale-specific guidance

The best pattern is:

- gateway listens on `127.0.0.1`
- `tailscale serve` exposes the UI to the Tailnet
- UI bootstrap may trust Tailscale identity headers
- API and control channels still use explicit tokens

This follows the same overall approach OpenClaw documents for its gateway, while keeping the broader Hermes-style auth discipline.

## Suggested config shape

```json
{
  "auth": {
    "uiMode": "token",
    "apiMode": "token",
    "allowTailscaleUi": true
  },
  "platforms": {
    "telegram": {
      "allowedUsers": ["123456789"]
    }
  }
}
```

## Hermes patterns worth adopting

- explicit per-platform allowlists
- deny by default
- optional DM pairing
- dangerous command approval

## Hermes patterns to defer

- broad allow-all flags
- full multi-platform pairing UX from day one
- public gateway deployment modes

## Source note

Hermes was useful as the auth model reference.

I did not find a Hermes-specific Tailscale gateway example in the local docs, so the Tailscale deployment guidance here is based on Tailscale’s official Serve docs and OpenClaw’s documented gateway pattern.
