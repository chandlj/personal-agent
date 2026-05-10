# Spec Review Guide

## Purpose

Use this guide when handing the `docs/` spec set to a fresh agent for review.

The goal is not to rewrite the architecture from scratch. The goal is to review the existing specs for:

- contradictions
- missing implementation detail
- unsafe assumptions
- sequencing problems
- overengineering
- unclear ownership between packages or services

## Scope

Review all of these files:

- `docs/ROADMAP.md`
- `docs/STATUS.md`
- `docs/OVERVIEW.md`
- `docs/ARCHITECTURE.md`
- `docs/STRUCTURE.md`
- `docs/components/README.md`
- `docs/components/AUTH.md`
- `docs/components/CLI.md`
- `docs/components/CONFIG.md`
- `docs/components/GATEWAY.md`
- `docs/components/INTER_AGENT.md`
- `docs/components/MEMORY.md`
- `docs/components/SANDBOXING.md`
- `docs/components/SCHEDULER.md`
- `docs/components/SCHEMA.md`
- `docs/components/TOOLS.md`
- `docs/components/TRANSCRIPTS.md`
- `docs/components/WORKSPACES.md`
- `docs/operations/IMPLEMENTATION.md`
- `docs/operations/OPERATIONS.md`
- `docs/operations/TESTING.md`
- `docs/research/FOUNDATION_RECOMMENDATION.md`
- `docs/research/EARLY_DESIGN.md`
- `docs/research/FUTURE.md`
- `docs/research/SOURCES.md`
- `docs/roadmap/`
- `docs/decisions/`

## Review mode

Treat this as a design and implementation review, not a prose polish review.

Focus primarily on:

1. architectural correctness
2. internal consistency across documents
3. feasibility of implementation
4. security and operational risk
5. whether the proposed milestone order is realistic
6. whether roadmap ownership is clear
7. whether the operational and policy docs are concrete enough to implement from

Only mention wording or style problems if they create ambiguity.

## What the reviewer should produce

The reviewer should give:

1. findings first, ordered by severity
2. each finding should name the file and the issue clearly
3. any open questions or assumptions
4. a short summary of whether the spec set is ready to implement

If there are no serious findings, the reviewer should say that explicitly and then list residual risks.

## Required review questions

The reviewer should answer these questions explicitly.

### Architecture

- Does the system boundary between runtime, gateway, scheduler, storage, auth, and sandboxing make sense?
- Are there places where two subsystems appear to own the same responsibility?
- Are any major runtime contracts missing?
- Are config, workspace, tool-policy, and transcript-event contracts explicit enough?
- Is the CLI clearly specified as a real frontend rather than an afterthought?

### Gateway

- Is the gateway design truly generic, or is it still implicitly Telegram-specific?
- Are session routing, delivery, commands, and auth separated cleanly?
- Is the Tailscale guidance safe and operationally realistic?

### Auth and security

- Are auth, approval, and sandbox boundaries clearly separated?
- Are there unsafe assumptions around Tailscale identity headers?
- Are host-execution risks called out clearly enough?

### Sandbox

- Is the Docker-default plus host-approved model coherent?
- Are there any missing guardrails for host tools?
- Does the design overestimate what OS-level sandboxing will protect on macOS?

### Memory

- Is the memory design small and practical enough for v1?
- Is the line between prompt memory and transcript search clear?
- Is any future memory extraction work incorrectly creeping into v1?

### Scheduler

- Does the scheduler model align with the gateway and session model?
- Are fresh-session job runs clearly specified?
- Are delivery targets and failure semantics clear enough?

### Inter-agent

- Is the distinction between in-process event bus and cross-process mailbox clear?
- Are the proposed mailbox semantics sufficient for future worker agents?
- Are there any missing tables or lifecycle rules?

### Data model

- Does `docs/components/SCHEMA.md` match the responsibilities described in the other docs?
- Are there missing indexes, missing foreign key relationships, or unclear ownership of tables?
- Is the schema too broad for the current implementation plan?

### Structure and implementation plan

- Does `STRUCTURE.md` fit the actual milestone order in `docs/operations/IMPLEMENTATION.md`?
- Are any packages premature?
- Is the suggested sequencing likely to create integration problems?

## Things the reviewer should be skeptical about

- anything that depends on Tailscale headers without strong loopback guarantees
- any place where the gateway and scheduler might duplicate session logic
- any place where package boundaries are too abstract for the current repo size
- any spec section that assumes pi features which only work in-process also work cross-process
- any part of the plan that sounds like “build Hermes in TypeScript” rather than a focused harness

## Useful context for the reviewer

The intended direction is:

- `pi-coding-agent` as the core runtime base
- custom gateway, memory, scheduler, and sandbox policy layers
- Telegram first
- Docker-first tool execution
- host tools only when explicitly needed

The intended anti-goal is:

- reproducing the full scope and complexity of Hermes

## Suggested prompt for the reviewer

```text
Review the spec set under docs/ as an implementation/design review.

Focus on bugs, contradictions, unclear contracts, security risks, sequencing problems, and overengineering.

Do not rewrite the system from scratch. Review the current proposal.

Read:
- docs/ROADMAP.md
- docs/STATUS.md
- docs/OVERVIEW.md
- docs/ARCHITECTURE.md
- docs/STRUCTURE.md
- docs/components/README.md
- docs/components/AUTH.md
- docs/components/CLI.md
- docs/components/CONFIG.md
- docs/components/GATEWAY.md
- docs/components/INTER_AGENT.md
- docs/components/MEMORY.md
- docs/components/SANDBOXING.md
- docs/components/SCHEDULER.md
- docs/components/SCHEMA.md
- docs/components/TOOLS.md
- docs/components/TRANSCRIPTS.md
- docs/components/WORKSPACES.md
- docs/operations/IMPLEMENTATION.md
- docs/operations/OPERATIONS.md
- docs/operations/TESTING.md
- docs/research/FUTURE.md
- docs/roadmap/
- docs/decisions/

Output format:
1. Findings first, ordered by severity
2. Include file references
3. Then open questions / assumptions
4. Then a short readiness summary
```

## Exit criteria for the review

The review is complete when the reviewer has:

- identified any contradictory or weak parts of the spec
- called out security or operational risks
- confirmed whether the milestone plan is implementable
- stated whether the docs are good enough to begin coding against
