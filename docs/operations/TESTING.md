# Testing Strategy

## Purpose

This doc defines the testing expectations for the repository.

## Testing layers

### Unit tests

Use for:

- config parsing
- workspace key generation
- scheduler parsing
- tool classification
- approval policy decisions

### Integration tests

Use for:

- runtime startup with resource loading
- SQLite migration and repository behavior
- Docker executor behavior
- gateway session routing
- scheduler job execution
- memory search and summarization

### End-to-end tests

Use sparingly for:

- Telegram message in, response out
- approval request and resolution flow
- scheduled delivery to a real adapter boundary

## Required milestone gates

### Before M1 is complete

- runtime loads resources correctly

### Before M2 is complete

- migrations run cleanly from empty database
- workspaces, sessions, and transcripts persist correctly

### Before M3 and M4 are complete

- Docker execution works
- protected paths are blocked
- host tool routing respects policy

### Before M5 is complete

- unauthorized Telegram user is denied
- authorized user gets a response
- transcripts persist

### Before M6 is complete

- dangerous host action pauses for approval
- denial path is auditable

### Before M7 is complete

- due job starts a fresh session
- job result is delivered and recorded

### Before M8 is complete

- memory files load into sessions
- memory updates persist
- transcript search returns expected matches

## Test data rules

- keep fixtures small
- prefer deterministic timestamps where possible
- avoid live external dependencies unless the test is explicitly end-to-end

## Non-goals

- benchmark infrastructure
- long-running fuzz suites in v1

## Ownership

- milestone docs define what must be true
- this doc defines the testing shape used to prove it
