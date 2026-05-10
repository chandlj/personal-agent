# Project Overview

## Vision

Personal Agent is an always-on, single-user agent for life, work, and personal development.

It is meant to function as a proactive personal assistant that helps organize day-to-day life, maintain continuity over time, support ongoing personal operations, and carry work forward without requiring every step to be driven manually in the moment.

This is not a public chatbot, a shared household assistant, a team collaboration system, or a general SaaS product. Personal Agent is intentionally designed for one operator and one personal context.

## Core Idea

Direct interaction is the center of the system.

Personal Agent should be something that can be talked to directly through always-available and local operator surfaces, while also being capable of continuing work in the background through scheduled and self-created follow-up jobs. The goal is not just responsiveness. The goal is durable assistance that can keep context, follow through, and remain useful over time.

## What It Should Do

At a high level, Personal Agent should:

- help plan and manage days
- track tasks, commitments, and ongoing work
- maintain continuity across life and work
- support broader personal operations over time
- assist with personal projects and development work
- schedule and manage future follow-up work for itself when useful

Daily planning and task tracking are central because they anchor the rest of the system's behavior. The agent should help determine what matters today, keep track of what has already happened, and support consistent follow-through across both short-term tasks and longer-term work.

The broader vision includes operational awareness across sources like calendars, tasks, email, and similar personal information systems. Those are not incidental integrations. They are part of the kind of context the agent is meant to understand and work with.

## Memory And Continuity

Personal Agent should build both continuity and understanding over time.

It should selectively retain the facts, preferences, commitments, patterns, and lessons that matter, rather than trying to remember everything indiscriminately. The purpose of memory is not exhaustive recall. The purpose is to make the agent more useful in future planning, decisions, follow-up work, and long-running personal operations.

In the near term, that means explicit long-term memory plus searchable history. Over time, the system should also grow toward stronger autonomous reflection so it can improve its own understanding, refine its behavior, and become a more capable long-term assistant.

## Interaction Model

Personal Agent is primarily a direct-interaction system, supported by background execution.

Telegram is the always-on surface. CLI and TUI are the local operator surfaces. Scheduled and proactive messages matter because they turn the system from a reactive assistant into an ongoing one. A web UI may become a useful operator surface later, but it is not required for the system to be valuable.

> [!NOTE]
> **@joe**: We should maybe not mention Telegram explicitly, as we may integrate other messaging apps. Perhaps just say messaging apps (i.e. WhatsApp, Telegram, iMessage) are the main entrypoints, while CLI and TUI are the local operator surfaces.

## Scope Boundary

Personal Agent is for one person only.

Its role is to support a single personal context with growing capability over time. Even as the system becomes more proactive, more reflective, and more capable of carrying work forward on its own, it remains a personal agent rather than a shared or public-facing system.

## Related Docs

Read next:

1. [ARCHITECTURE.md](./ARCHITECTURE.md)
2. [STRUCTURE.md](./STRUCTURE.md)
3. [ROADMAP.md](./ROADMAP.md)
4. [components/README.md](./components/README.md)
