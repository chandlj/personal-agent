# Configuration Reference

## Purpose

This is the canonical configuration reference for the personal agent.

Use it to answer:

- which settings exist
- where they can be set
- which values are required
- which defaults are expected in v1

## Sources and precedence

Apply config in this order, last writer wins:

1. built-in defaults
2. `~/.personal-agent/config.json`
3. `~/.personal-agent/.env`
4. project-local `.personal-agent/settings.json` for operator-owned CLI workspaces
5. explicit CLI flags

Environment variables should only override the settings they map to directly.

### Example precedence

Given:

1. `config.json` sets `"runtime.model": "gpt-5"`
2. `.env` sets `PERSONAL_AGENT_MODEL=gpt-5-mini`
3. project-local CLI settings set `"runtime.model": "gpt-5-nano"`

the effective value should be `gpt-5-nano` unless a CLI flag overrides it again.

## v1 config surfaces

### Global files

- `~/.personal-agent/config.json`
- `~/.personal-agent/.env`

### Workspace-local file

- `<workspace-root>/.personal-agent/settings.json`

Use this only for operator-owned CLI project workspaces, not for generated Telegram or scheduler workspaces.

## Required v1 settings

### Runtime

- `runtime.model`
- `runtime.provider`

### Gateway

- `gateway.telegram.botToken`
- `gateway.telegram.allowedUsers`

### Sandbox

- `sandbox.docker.image`
- `sandbox.docker.workspaceRoot`

## Suggested config shape

```json
{
  "runtime": {
    "provider": "openai",
    "model": "gpt-5"
  },
  "gateway": {
    "telegram": {
      "botToken": "env:TELEGRAM_BOT_TOKEN",
      "allowedUsers": ["123456789"],
      "allowedChats": [],
      "homeChatId": "123456789"
    }
  },
  "sandbox": {
    "docker": {
      "image": "personal-agent:base",
      "workspaceRoot": "~/.personal-agent/workspaces",
      "defaultWorkdir": "/workspace"
    },
    "host": {
      "enabledTools": ["notification", "open", "applescript"],
      "requireApprovalByDefault": true
    }
  },
  "memory": {
    "memoryCharLimit": 2200,
    "userCharLimit": 1375,
    "searchSummaryEnabled": true
  },
  "scheduler": {
    "maxConcurrentRuns": 2,
    "defaultTimezone": "America/New_York"
  },
  "state": {
    "databasePath": "~/.personal-agent/state/state.db"
  },
  "auth": {
    "uiMode": "token",
    "apiMode": "token",
    "allowTailscaleUi": true
  }
}
```

## Exact TypeScript interface

```ts
type PersonalAgentConfig = {
  runtime: {
    provider: string;
    model: string;
  };
  gateway: {
    telegram?: {
      botToken: string;
      allowedUsers: string[];
      allowedChats?: string[];
      homeChatId?: string;
    };
  };
  sandbox: {
    docker: {
      image: string;
      workspaceRoot: string;
      defaultWorkdir: string;
    };
    host: {
      enabledTools: Array<"notification" | "open" | "applescript">;
      requireApprovalByDefault: boolean;
    };
  };
  memory: {
    memoryCharLimit: number;
    userCharLimit: number;
    searchSummaryEnabled: boolean;
  };
  scheduler: {
    maxConcurrentRuns: number;
    defaultTimezone: string;
  };
  state: {
    databasePath: string;
  };
  auth: {
    uiMode: "token" | "password" | "tailscale";
    apiMode: "token";
    allowTailscaleUi: boolean;
  };
};
```

## Environment variable mapping

Use environment variables for secrets and machine-specific overrides.

Suggested mappings:

- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `PERSONAL_AGENT_MODEL`
- `PERSONAL_AGENT_PROVIDER`
- `PERSONAL_AGENT_DB_PATH`

Keep the env surface intentionally small in v1.

### Example env file

```bash
TELEGRAM_BOT_TOKEN=123456:abc
OPENAI_API_KEY=sk-...
PERSONAL_AGENT_MODEL=gpt-5
```

## Config ownership

### `packages/config`

Should own:

- schema validation
- defaults
- env parsing
- merge order
- path expansion for `~`

### Other packages

Should consume typed config only. They should not parse env vars directly.

### Example usage

```ts
const config = loadConfig();
const image = config.sandbox.docker.image;
const allowedUsers = config.gateway.telegram.allowedUsers;
```

## Rules

- all paths should be normalized before use
- unknown config keys should be rejected in strict mode
- secrets should not be stored in workspace-local config
- workspace-local config must not override operator auth or sandbox allowlists
- workspace-local config must only be loaded for operator-owned CLI project roots
- generated chat workspaces must not be treated as config override roots
- default values should be explicit in code and documented here

## Open items

- final model/provider schema
- exact CLI flag surface
- whether per-workspace model overrides ship in v1
