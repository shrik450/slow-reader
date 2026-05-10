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

## Type Safety

### Disabling lint or types

Agents must not introduce `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `@ts-check`, `oxlint-disable*`, `eslint-disable*`, or any other rule-suppression comment — **with or without** a justification. A description does not unlock these. There is no approved-exception process; the policy in `docs/type-safety-policy.md` is "no disables, full stop." If a rule appears wrong, surface it in your output and stop; the user decides whether to change the rule itself.

The pre-commit hook and CI both run `scripts/check-disable-comments.ts` against newly-added diff lines and fail on a match. `--no-verify` is the user's prerogative; agents do not use it.

### Toolchain assumptions

Agents must not pattern-match from Express/Node/Prisma when working with Elysia/Bun/Drizzle.

- **Bun ≠ Node**: prefer `Bun.file` / `Bun.serve` / `bun:sqlite` / `bun:test`; use `import.meta.main` for entry guards; no `dotenv` (Bun auto-loads `.env`); `bun test` mocks are not Jest's API; `__dirname` / `__filename` exist only in CJS.
- **Elysia ≠ Express/Hono**: type inference depends on chained `.get` / `.post` — do not break the chain by assigning mid-build to a loosely-typed variable. State via `.decorate` / `.derive` / `.state`, not `req.app.locals`. Lifecycle via `.onBeforeHandle` / `.onAfterHandle` / `.onError`, not `(req, res, next)`. Return values become responses; there is no `res.send`. Validate with `t.*` (TypeBox).
- **Drizzle ≠ Prisma**: no generated client; query builder (`db.select().from(...).where(eq(...))`) or relational query API. Joins are explicit. Transactions via `db.transaction(async (tx) => …)`. Types via `$inferSelect` / `$inferInsert`. Migrations via `drizzle-kit generate` + the file-based migrator; no `db:push` in prod.

Default rule: when unsure how something works, read the actual library source/docs. Do not guess.

### Validation conventions — TypeBox (dual install accepted)

The dependency tree contains two TypeBox packages with different module roots. **Schemas are not interchangeable between them.** Every TypeBox import must explicitly name its package.

- **`@sinclair/typebox` (0.34.x)** — Elysia routes (`t.*`), DB validators (`drizzle-typebox`), and all general boundary parsing (env, fetch, queue payloads, LLM JSON consumed outside pi-ai tools). Elysia 1.4.28 hard-pins this version range; there is no way to unify on `typebox@1.x` without forking Elysia.
- **`typebox` (1.x)** — used **only** for `@mariozechner/pi-ai` tool and structured-output schemas.

Cross-seam handoff (e.g., LLM tool output → DB write) re-validates on each side; do not pass schemas across the boundary.

Conventions:

- **Routes**: inline `t.*` schemas from `elysia` (which re-exports `@sinclair/typebox`). Idiomatic Elysia.
- **DB validators**: `drizzle-typebox` (`createSelectSchema` / `createInsertSchema` / `createUpdateSchema`). Migration to `drizzle-orm/typebox` is an import-path rename when we upgrade to drizzle 1.x — no behavioral migration, no lock-in.
- **General boundary parsing** (env, fetch, queue payloads, any LLM JSON outside pi-ai): a sibling `*.schema.ts` exporting the schema from `@sinclair/typebox` and `type X = Static<typeof X>` so types and validators stay paired. Use `import { Value } from "@sinclair/typebox/value"` + `Value.Errors(schema, data)` for path-shaped errors. Never `JSON.parse(...) as T`, never `as` casts on external data.
- **pi-ai tools**: import `Type` and `Static` from **`typebox`** (not `@sinclair/typebox`). Tool parameter and structured-output schemas live next to the tool definition. Do not attempt to share these schemas with route or DB code.
- **Imports must be unambiguous**: every TypeBox import explicitly names its package (`@sinclair/typebox` vs `typebox`). The `/adversarial-review` skill flags any file mixing the two.

### Domain-typing conventions

- **Branded types** for IDs and domain primitives (`UserId`, `ArticleId`, `Cents`, `Url`). A `string` is not a `UserId`.
- **`unknown` over `any`**; narrow via predicate or schema parse — never via `as`.
- **Exhaustiveness** on every discriminated-union switch via the shared `assertNever(x: never)` helper in `src/util/assert-never.ts`. The `default:` branch calls it so adding a new variant becomes a compile error.
- **`catch (err: unknown)`** — never re-throw or log without narrowing first.
- **`as` is a code smell.** Every `as` needs a one-line comment explaining why the type system can't see it. `as any` and `as unknown as T` are forbidden outside test fixtures.
