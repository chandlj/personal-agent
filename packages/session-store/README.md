# Session Store

`@personal-agent/session-store` owns the local SQLite control-plane database. In M2 it stores only chat and gateway state: workspaces, sessions, session-entry tree history, and full-text search over entry text.

## Opening a Store

Open the database once per app process and pass the returned handle to repositories:

```ts
import { loadAppConfig } from "@personal-agent/config";
import {
  createSessionEntryRepository,
  createSessionRepository,
  createWorkspaceRepository,
  openSessionStore
} from "@personal-agent/session-store";

const store = await openSessionStore({ config: loadAppConfig() });

try {
  const workspaces = createWorkspaceRepository(store, {
    workspaceRoot: "/Users/me/.personal-agent/workspaces"
  });
  const sessions = createSessionRepository(store);
  const entries = createSessionEntryRepository(store);
} finally {
  store.close();
}
```

`openSessionStore()` accepts either `config.state.databasePath` or an explicit `databasePath`. It creates missing parent directories, enables SQLite foreign keys, and runs the packaged Drizzle migrations before returning.

## Connection Lifetime

Keep one `SessionStoreDatabase` open for the lifetime of a CLI, gateway, or scheduler process, then call `store.close()` during shutdown. Tests may use `databasePath: ":memory:"` for isolated in-memory databases or a temporary file when validating migration and persistence behavior.

## Repository Scope

Use the typed repositories instead of raw SQL from apps:

- `createWorkspaceRepository()` resolves CLI and gateway workspaces.
- `createSessionRepository()` manages active session routing and lifecycle.
- `createSessionEntryRepository()` appends tree-shaped entries, moves the active leaf, and searches FTS text.

Approvals, scheduler rows, memory audit rows, and inter-agent mailbox tables are intentionally deferred to later milestones.
