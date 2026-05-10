# ADR-001 Fresh Scheduled Sessions

## Status

Accepted

## Decision

Scheduled jobs always run in fresh sessions.

They do not attach to the live interactive queue for an existing chat session. They may reuse the same workspace and the same delivery adapters.

## Rationale

- easier to reason about
- avoids contaminating an interactive session
- cleaner failure and audit boundaries
- matches the current scheduler design across the rest of the docs

## Consequences

- scheduled prompts must carry the context they need
- scheduler needs explicit workspace resolution
- delivery and execution are separate concerns
