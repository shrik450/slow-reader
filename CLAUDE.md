# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Readme Driven Development

`README.md` describes target user-facing features, not what is implemented. Do not assume any feature in the README exists in code — verify against the source.

## Toolchain

- **Bun** for runtime, package manager, and test runner. Do not use npm/pnpm/yarn/node/ts-node. Bun auto-loads `.env`; do not add `dotenv`.
- **Elysia** for HTTP routing on top of Bun's server.
- **oxlint + oxfmt** for lint and format. Do not propose or add Biome, ESLint, or Prettier.
- **`bun test`** for tests (Jest-compatible API). Do not propose Vitest or Jest.

The README commits to SQLite as the database, but no database client, schema, or migration tooling has been wired up yet — that is an open decision (likely `bun:sqlite` direct vs. Drizzle).

## Commands

- `bun run dev` — hot-reloading server
- `bun start` — run server once
- `bun test` — all tests
- `bun test src/index.test.ts` — single file
- `bun test -t "returns ok"` — filter by test name
- `bun run lint` / `bun run format` / `bun run format:check`
- `bun run typecheck` — `tsc --noEmit`

The `prepare` script wires git hooks on `bun install` by setting `core.hooksPath = .githooks`. The pre-commit hook runs `lint` and `format:check`.

## Architecture

**Server entry pattern (`src/index.ts`).** The Elysia `app` is exported at module scope, but `app.listen()` only runs under `if (import.meta.main)`. This lets tests import `app` and call `app.handle(new Request(...))` without binding a port. Add routes to the exported `app`; preserve the main guard.

**CI** (`.github/workflows/ci.yml`) runs install → lint → format check → typecheck → test on push to `main` and PRs, with Bun version pinned.

**Docker.** `Dockerfile` is multi-stage on `oven/bun:1.3`. `docker-compose.yml` is the bare-minimum runtime; the README also references a "maximalist" `docker-compose-full.yml` (Litestream + Jaeger) which is not yet implemented.
