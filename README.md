# Personal Agent

Monorepo scaffold for a TypeScript personal agent harness based on the design docs in this directory.

## Tooling

- package manager/runtime: Bun
- typechecker: TypeScript through `bunx tsc`
- formatter/linter: Biome

This is a Bun-first source-native workspace. TypeScript is configured with `noEmit: true`,
and local packages resolve from `src/index.ts` instead of generated `dist/` files.

Common commands:

```sh
bun install
bun run check
bun run lint
bun run format
bun run fix
bun run build
bun run dev:gateway
```

## Workspace

- `apps/cli` - local operator entrypoint
- `apps/gateway` - messaging gateway and future control API
- `apps/scheduler` - scheduled job runner
- `packages/*` - shared runtime, storage, auth, sandboxing, and adapters

## Status

This is a scaffold. The package boundaries and initial interfaces are in place, but most modules are placeholders.

See:

- `docs/ROADMAP.md`
- `docs/operations/IMPLEMENTATION.md`
- `docs/STRUCTURE.md`
