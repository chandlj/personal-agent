# Sources

## Official project sources used

### Hermes Agent

- Repo: https://github.com/NousResearch/hermes-agent
- Site: https://nousresearch.com/hermes-agent/
- Docs: https://hermes-agent.nousresearch.com/docs/

Local files inspected:

- `hermes-agent/README.md`
- `hermes-agent/website/docs/user-guide/messaging/telegram.md`
- `hermes-agent/website/docs/user-guide/security.md`
- `hermes-agent/website/docs/user-guide/features/cron.md`
- `hermes-agent/website/docs/user-guide/features/memory.md`
- `hermes-agent/website/docs/user-guide/features/skills.md`
- `hermes-agent/website/docs/user-guide/features/tools.md`
- `hermes-agent/website/docs/developer-guide/architecture.md`

### pi-mono / pi-coding-agent

- Repo: https://github.com/badlogic/pi-mono

Local files inspected:

- `pi-mono/README.md`
- `pi-mono/packages/coding-agent/README.md`
- `pi-mono/packages/agent/README.md`
- `pi-mono/packages/tui/README.md`
- `pi-mono/packages/mom/README.md`
- `pi-mono/packages/mom/docs/sandbox.md`
- `pi-mono/packages/mom/docs/events.md`
- `pi-mono/packages/mom/src/slack.ts`
- `pi-mono/packages/mom/src/agent.ts`
- `pi-mono/packages/mom/src/events.ts`
- `pi-mono/packages/mom/src/sandbox.ts`
- `pi-mono/packages/coding-agent/docs/sdk.md`
- `pi-mono/packages/coding-agent/docs/extensions.md`
- `pi-mono/packages/coding-agent/docs/skills.md`
- `pi-mono/packages/coding-agent/docs/tui.md`
- `pi-mono/packages/coding-agent/docs/rpc.md`
- `pi-mono/packages/coding-agent/examples/extensions/README.md`
- `pi-mono/packages/coding-agent/examples/extensions/sandbox/index.ts`
- `pi-mono/packages/coding-agent/examples/extensions/permission-gate.ts`
- `pi-mono/packages/coding-agent/examples/extensions/protected-paths.ts`
- `pi-mono/packages/coding-agent/examples/extensions/tool-override.ts`
- `pi-mono/packages/coding-agent/examples/extensions/subagent/README.md`
- `pi-mono/packages/coding-agent/examples/extensions/plan-mode/README.md`

## Supporting implementation-source links

- grammY: https://grammy.dev/
- grammY getting started: https://grammy.dev/guide/getting-started
- Telegraf: https://telegraf.js.org/
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- better-sqlite3 npm: https://npm.io/package/better-sqlite3
- sandbox-runtime mirror note: https://pypi.org/project/sandbox-runtime/
- Tailscale Serve overview: https://tailscale.com/docs/features/tailscale-serve
- Tailscale web sharing docs: https://tailscale.com/docs/share-web-server
- OpenClaw Tailscale gateway docs: https://docs.openclaw.ai/gateway/tailscale

## Notes

- Hermes was evaluated mainly as a feature reference and architecture reference.
- pi-mono was evaluated mainly as the implementation base for a smaller TypeScript-native harness.
- The recommendation intentionally prefers ownership and extensibility over using the most feature-complete existing project unchanged.
