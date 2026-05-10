# Scheduler

## Recommendation

Run scheduling as a dedicated service, not inside the Telegram gateway request path.

Use `croner` for in-process scheduling and SQLite for durable job storage.

## Job model

Each job should contain:

- `id`
- `name`
- `prompt`
- `schedule`
- `timezone`
- `delivery_target`
- `workspace_id`
- `origin_session_id`
- `enabled`
- `skills`
- `created_by`
- `last_run_at`
- `next_run_at`

## Exact TypeScript interfaces

```ts
type JobDeliveryTarget = "origin" | "telegram-home" | `telegram-chat:${string}` | "local-file" | "silent";

type ScheduledJob = {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  timezone: string;
  deliveryTarget: JobDeliveryTarget;
  workspaceId: string;
  originSessionId?: string;
  enabled: boolean;
  skills: string[];
  createdBy?: string;
  lastRunAt?: string;
  nextRunAt?: string;
};

type JobRunRecord = {
  id: string;
  jobId: string;
  sessionId: string;
  status: "running" | "success" | "failed" | "cancelled";
  startedAt: string;
  finishedAt?: string;
  outputText?: string;
  errorText?: string;
};
```

### Example job

```json
{
  "id": "job_daily_briefing",
  "name": "daily-briefing",
  "prompt": "Summarize today's repo activity and send the result to my home chat.",
  "schedule": "0 9 * * *",
  "timezone": "America/New_York",
  "delivery_target": "telegram-home",
  "workspace_id": "ws_123",
  "origin_session_id": "sess_456",
  "enabled": true,
  "skills": ["repo-review"]
}
```

## Execution model

Each scheduled run should:

1. create a fresh agent session
2. attach it to the configured workspace
3. load configured skills and prompt resources
4. execute the job prompt
5. persist transcript and run metadata
6. deliver the final result to the configured target through the gateway delivery layer

This avoids scheduler runs contaminating an interactive live session while still letting scheduled work operate on the same workspace as the originating chat when needed.

### Example execution timeline

1. scheduler sees `job_daily_briefing` is due
2. scheduler resolves `workspace_id=ws_123`
3. scheduler creates a fresh session like `agent:main:scheduler:job:job_daily_briefing:run_001`
4. runtime loads resources and memory
5. prompt executes
6. result is delivered to `telegram-home`
7. `job_runs` and `job_deliveries` rows are written

## Supported schedules

Start with:

- one-shot ISO timestamps
- recurring cron expressions
- relative formats like `30m` or `every 2h`

Normalize all of them into one stored representation.

### Example schedule inputs

- one-shot: `2026-04-04T09:00:00-04:00`
- cron: `0 9 * * *`
- relative: `every 2h`

## Delivery rules

Recommended targets:

- `origin`
- `telegram-home`
- `telegram-chat:<id>`
- `local-file`
- `silent`

`silent` is useful for periodic checks that only need to report when something changed.

### Example target behavior

- `origin`: send back to the originating chat or thread
- `telegram-home`: send to the fixed home chat configured as `gateway.telegram.homeChatId`
- `local-file`: write to a configured file target
- `silent`: record the run without sending a normal message unless some later rule decides otherwise

## Guardrails

- no recursive cron creation from cron jobs by default
- max concurrent scheduled runs
- per-job timeout
- audit every run
- explicit job pause and resume states
- scheduled runs must never attach to the live interactive queue for an existing chat session

## Suggested schema additions

Tables:

- `jobs`
- `job_runs`
- `job_deliveries`

This gives you clean operational history and easier debugging.

## Why this approach

Hermes is right about one important design choice here: scheduled work should be treated as agent work, not just shell work.

You want the scheduler to wake the agent with skills, memory, and normal tools, then deliver the result through the same messaging layer as any other conversation.
