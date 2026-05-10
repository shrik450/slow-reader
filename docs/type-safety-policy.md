# Type-Safety Policy

This is the canonical policy doc for type safety in this repo. `CLAUDE.md` summarises the operational rules; this file states them in stronger form.

The headline rule is **no rule-suppression comments, ever**. There is no exception process and no granted-exception list. If a rule genuinely needs to change, the user changes the rule itself (in `.oxlintrc.json` or the relevant config). Agents do not.

---

## The disable-comment ban

The following are forbidden anywhere in the codebase:

- `@ts-ignore`
- `@ts-expect-error`
- `@ts-nocheck`
- `@ts-check`
- `oxlint-disable`, `oxlint-disable-next-line`, `oxlint-disable-line`, and any file-scope variant
- `eslint-disable*` (even though oxlint is the linter — blocks creative-spelling evasion)

A description does not unlock these. "Just this once" does not unlock these. If a rule appears wrong:

1. Stop.
2. Surface the apparent false positive (file, line, rule, why you believe it's wrong).
3. Wait for the user to decide whether to change the rule itself.

Enforcement layers:

- **oxlint** `typescript/ban-ts-comment` rejects every `@ts-*` variant.
- **Pre-commit hook** (`.githooks/pre-commit`) runs `scripts/check-disable-comments.ts` against staged changes; commit fails on a match.
- **CI** runs the same script against `origin/<base>...HEAD` for PRs and `HEAD^...HEAD` for pushes to main.

`git commit --no-verify` is the user's prerogative. Agents do not use it.

---

## Toolchain rules

These are not preferences. They are policy. Pattern-matching from Express/Node/Prisma into Elysia/Bun/Drizzle code is the most common source of subtle bugs in agent-authored code; the rules below exist to prevent those mismatches at write time, not catch them at review time.

### Bun is not Node

- Use `Bun.file`, `Bun.serve`, `bun:sqlite`, `bun:test` where applicable. Do not reach for `fs.promises`, `http`, `sqlite3`, `jest` / `vitest` when a Bun-native primitive exists.
- Entry guards use `import.meta.main`. Do not use `require.main === module`.
- Bun auto-loads `.env`. Do not add `dotenv` or call `dotenv.config()`.
- `bun test`'s mock API is **not** Jest's. Do not assume `jest.fn`, `jest.mock`, `jest.spyOn` exist. Use `mock(...)` and `spyOn(...)` from `bun:test`.
- `__dirname` / `__filename` only exist in CJS. In ESM use `import.meta.url` + `new URL(...)` or `path.fileURLToPath`.
- Package management is `bun add` / `bun install` / `bun run`. Never `npm`, `pnpm`, `yarn`, `npx`, `node`, or `ts-node`.

### Elysia is not Express or Hono

- Type inference depends on the chained builder pattern (`.get(...).post(...).onError(...)`). **Do not** break the chain by assigning a mid-build instance to a `let` and re-assigning, or by typing it as a loosely-typed `Elysia` variable — you will silently lose route inference.
- Request-scoped state goes through `.decorate` / `.derive` / `.state`. There is no `req.app.locals`.
- Lifecycle hooks are `.onBeforeHandle` / `.onAfterHandle` / `.onError` / `.onRequest` / `.onResponse`. There is no `(req, res, next)` middleware signature.
- Handler return values become the response. There is no `res.send`, `res.json`, or `res.status(...).send(...)`. Set status with the `set.status` context property or by throwing a typed error.
- Validate with `t.*` (TypeBox via Elysia's re-export of `@sinclair/typebox`). Do not introduce Zod, Valibot, ArkType, or Yup ad hoc.

### Drizzle is not Prisma

- There is no generated client. Use the query builder (`db.select().from(...).where(eq(...))`) or the relational query API (`db.query.users.findFirst(...)`).
- Joins are explicit. There is no automatic relation resolution; you write the join or use `with: { ... }` in the relational API.
- Transactions: `db.transaction(async (tx) => { ... })`. Use `tx`, not `db`, inside the callback.
- Row types come from `typeof table.$inferSelect` and `typeof table.$inferInsert`. Do not hand-write row interfaces.
- Schema validators come from `drizzle-typebox` (`createSelectSchema` / `createInsertSchema` / `createUpdateSchema`).
- Migrations are file-based: `bun run db:generate` writes SQL into `drizzle/`, `bun run db:migrate` applies via `drizzle-orm/bun-sqlite/migrator`. **Do not** call `drizzle-kit push` in production or in app boot paths.

### Validation — dual TypeBox

The dependency tree contains two separate TypeBox packages. Schemas built from one are **not** interchangeable with the other.

- `@sinclair/typebox` (0.34.x) — for Elysia routes, `drizzle-typebox` validators, and all general boundary parsing (env, fetch, queue payloads, LLM JSON consumed outside pi-ai tools).
- `typebox` (1.x) — used **only** for `@mariozechner/pi-ai` tool and structured-output schemas.

Every TypeBox import must explicitly name its package. Files must not mix imports from the two. Cross-seam handoff re-validates on each side.

Never `JSON.parse(input) as T`. Never `as` on external data. Use `Value.Parse` / `Value.Check` / `Value.Errors` from `@sinclair/typebox/value` and surface path-shaped errors.

### Domain typing

- **Branded types** for IDs and domain primitives (`UserId`, `ArticleId`, `Cents`, `Url`). A `string` is not a `UserId`.
- **`unknown` over `any`**; narrow via predicate or schema parse — never via `as`.
- **Exhaustiveness**: every discriminated-union switch ends its `default:` with a call to the shared `assertNever(x: never)` helper in `src/util/assert-never.ts`. Adding a new variant without updating the switch then becomes a compile error.
- **`catch (err: unknown)`** — never re-throw or log without narrowing.
- **`as` requires a one-line comment** explaining why the type system can't see what you can. `as any` and `as unknown as T` are forbidden outside test fixtures.
