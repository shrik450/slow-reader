# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Readme Driven Development

`README.md` describes target user-facing features, not what is implemented. Do not assume any feature in the README exists in code — verify against the source.

## Toolchain

- **Bun** for runtime, package manager, and test runner. Do not use npm/pnpm/yarn/node/ts-node. Bun auto-loads `.env`; do not add `dotenv`.
- **Elysia** for HTTP routing on top of Bun's server.
- **oxlint + oxfmt** for lint and format. Do not propose or add Biome, ESLint, or Prettier.
- **`bun test`** for tests (Jest-compatible API). Do not propose Vitest or Jest.
- **Drizzle ORM** on `bun:sqlite` (`drizzle-orm/bun-sqlite`). Migrations are file-based via `drizzle-kit generate` (checked into `drizzle/`) and applied with the `drizzle-orm/bun-sqlite/migrator`. Do not use `drizzle-kit push` in prod.

## Commands

- `bun run dev` — hot-reloading server
- `bun start` — run server once
- `bun test` — all tests
- `bun test src/index.test.ts` — single file
- `bun test -t "returns ok"` — filter by test name
- `bun run lint` / `bun run format` / `bun run format:check`
- `bun run typecheck` — `tsc --noEmit`
- `bun run db:generate` — generate SQL migrations from `src/db/schema.ts` into `drizzle/`
- `bun run db:migrate` — apply pending migrations to `DATABASE_URL`
- `bun run db:studio` — drizzle-kit studio

The `prepare` script wires git hooks on `bun install` by setting `core.hooksPath = .githooks`. The pre-commit hook runs `lint` and `format:check`.

## Architecture

**Server entry pattern (`src/index.ts`).** Routes are built by the exported `createApp({ db })` factory, which returns an Elysia instance with the db bound via `.decorate("db", db)`. The default db and the listening server are constructed only inside `if (import.meta.main)` (which also runs `runMigrations` first) — keeping module import side-effect-free so tests can import `createApp` without opening the prod sqlite file. Tests pass an in-memory db: `createApp({ db: createDb(":memory:") })`. Add routes inside `createApp`; preserve the main guard.

**Database (`src/db/`).** `client.ts` exports `createDb(url)` (which `mkdir -p`s the parent dir for file-backed urls and sets `journal_mode = WAL` + `foreign_keys = ON`) and `defaultDb()` which builds a db from `DATABASE_URL` (defaults to `./data/slow-reader.db`). `schema.ts` is the single Drizzle schema entry point. `migrate.ts` exposes `runMigrations(db)` and is also a CLI when invoked directly. The migrator no-ops if `drizzle/meta/_journal.json` is absent, so a fresh checkout boots without first running `db:generate`.

**CI** (`.github/workflows/ci.yml`) runs install → lint → format check → typecheck → test on push to `main` and PRs, with Bun version pinned.

**Docker.** `Dockerfile` is multi-stage on `oven/bun:1.3`. The runtime stage copies `drizzle.config.ts` and `drizzle/`, defaults `DATABASE_URL=/app/data/slow-reader.db`, and declares a `/app/data` volume. `docker-compose.yml` mounts the named `slow-reader-data` volume there. The container's `CMD` runs the server, which auto-applies migrations on boot. The README also references a "maximalist" `docker-compose-full.yml` (Litestream + Jaeger) which is not yet implemented.
