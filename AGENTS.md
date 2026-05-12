# Repository Guidelines

## Project Structure & Module Organization

This is a Bun-first TypeScript monorepo. Runtime entrypoints live in `apps/`: `apps/cli`, `apps/gateway`, and `apps/scheduler`. Reusable code lives in `packages/`, including runtime orchestration, config, session storage, sandboxing, gateway adapters, and shared utilities. Tests are colocated with source files as `*.test.ts`, for example `packages/agent-runtime/src/runtime.test.ts`. Long-form design and operations notes live in `docs/`; keep architectural updates there rather than in source comments.

## Build, Test, and Development Commands

- `bun install`: install workspace dependencies from `bun.lock`.
- `bun run check`: run TypeScript checking across the root project.
- `bun test`: run all Bun tests.
- `bun run lint`: run Biome lint checks.
- `bun run format:check`: check formatting without writing changes.
- `bun run fix`: apply Biome formatting, lint fixes, and source assists.
- `bun run dev:cli`, `bun run dev:gateway`, `bun run dev:scheduler`: run app entrypoints in watch mode.
- `bun run start:cli`, `bun run start:gateway`, `bun run start:scheduler`: run app entrypoints once.

## Coding Style & Naming Conventions

Use TypeScript ES modules and source-native workspace imports. Package exports should point at `src/index.ts`; this repo does not rely on generated `dist/` output. Biome defines the style: 2-space indentation, 100-character line width, double quotes, semicolons, and no trailing commas. Prefer small, typed modules with explicit domain names such as `resource-loader.ts`, `repositories.ts`, and `scheduler.ts`.

## Testing Guidelines

Use Bun’s test runner. Keep tests next to the code they exercise and name them `*.test.ts`. Focus tests on package behavior and cross-module contracts, especially runtime, persistence, config loading, and scheduler behavior. Before opening a PR, run `bun test` and `bun run check`; add `bun run lint` when touching style-sensitive code.

## Commit & Pull Request Guidelines

Use Conventional Commits for commit messages and PR titles, for example `feat(runtime): add resource loader` or `fix(session-store): close database handle`. Include the Linear issue key when one exists, such as `feat(runtime): PER-8 add default resource loader`. Keep subjects imperative and under one line. Pull requests should include a concise description, linked issue or milestone, test results, and notes about schema, config, or operational changes. Include screenshots only for user-visible UI changes.

## Security & Configuration Tips

Do not commit secrets, local credentials, or generated runtime state. Keep configuration schema changes in `packages/config`, database changes with the session-store Drizzle files, and document operational implications under `docs/operations/`.
