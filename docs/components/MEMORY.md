# Memory Design

## Recommendation

For v1, copy Hermes's local memory design closely:

- small bounded prompt memory in files
- larger searchable session history in SQLite
- explicit distinction between user profile and environment memory
- optional future user-modeling layered on top, not mixed into the core files

That gives you a strong memory system in v1 without taking on Honcho-class infrastructure immediately.

## Memory layers

### 1. Prompt memory

Two Markdown files:

- `MEMORY.md`: environment facts, workflows, recurring lessons
- `USER.md`: communication preferences, personal defaults, identity

These are the canonical prompt-memory stores. They are loaded into the system prompt at session start as a frozen snapshot and do not change mid-session.

Keep them bounded. Start with Hermes-style limits:

- `MEMORY.md`: about 2,200 characters
- `USER.md`: about 1,375 characters

Those limits should stay configurable, but the default should be tight enough that the prompt memory remains curated.

### Example files

`MEMORY.md`

```md
Project uses pnpm. Run tests with `pnpm test`. Main repo is at ~/projects/personal-agent.
```

`USER.md`

```md
User prefers concise answers and wants explicit file references when reviewing code.
```

### 2. Session memory

Store all conversation turns, tool calls, tool results, and delivery metadata in SQLite.

Add:

- FTS5 index over message text
- chat/session identifiers
- timestamps
- tool names
- labels such as `telegram`, `cli`, `cron`

This gives you practical long-term recall without bloating the prompt.

### 3. Structured memory metadata

Track memory entries in SQLite as an audit and indexing mirror of the files.

The files remain the source of truth. The database exists so the memory service can audit edits, reject duplicates, and keep a structured view of the active entries.

Minimal row shape:

- `memory_entries`
  - `id`
  - `store` (`memory` or `user`)
  - `entry_key`
  - `content`
  - `source`
  - `status` (`active`, `superseded`, `deleted`)
  - `session_id`
  - `created_at`
  - `updated_at`

### Example mirrored row

```json
{
  "store": "user",
  "entry_key": "user-prefers-concise-answers",
  "content": "User prefers concise answers and wants explicit file references when reviewing code.",
  "source": "cli",
  "status": "active"
}
```

## Retrieval policy

Use this order:

1. prompt memory always loaded
2. transcript search only when needed
3. summarize matching transcript windows when the raw hits are too large
4. optional future user-modeling retrieval

Do not default to embeddings or vector search in v1. Hermes gets a lot of value from bounded file memory plus transcript recall before any heavier memory stack enters the picture.

### Example retrieval

If the user asks:

```text
What did we decide about the scheduler last week?
```

expected sequence:

1. current `MEMORY.md` and `USER.md` are already in prompt context
2. memory service runs transcript search for `scheduler`
3. matching transcript windows are summarized if raw hits are too large
4. assistant answers using those results

## Update policy

Let the agent suggest memory writes, but enforce a memory service boundary.

Useful actions:

- `addMemory`
- `replaceMemory`
- `removeMemory`
- `searchSessions`

Rules:

- exact duplicates should be rejected
- edits should be audited
- prompt memory should stay under configured limits
- memory writes from Telegram should still go through the same service
- memory changes should write through to the Markdown files immediately
- prompt-injected memory should be scanned for obvious prompt-injection or exfiltration content before acceptance

### Example updates

Add memory:

```json
{
  "action": "addMemory",
  "store": "memory",
  "content": "Gateway uses grammY as the Telegram adapter."
}
```

Replace memory:

```json
{
  "action": "replaceMemory",
  "store": "memory",
  "match": "Gateway uses grammY",
  "content": "Gateway uses grammY for Telegram and keeps core routing generic."
}
```

## File layout

```text
~/.personal-agent/
  memories/
    MEMORY.md
    USER.md
  state/
    state.db
```

## Recommended first cut

Start with:

- bounded `MEMORY.md` and `USER.md`
- `add/replace/remove` memory operations
- SQLite transcript store
- FTS5 session search
- lightweight transcript summarization over search hits

Defer:

- autonomous extraction from every transcript
- embeddings
- external user-modeling services
- automatic skill creation from memory events

Those are good later features, but they are not needed to make the harness useful.
