---
name: adversarial-review
description: Forensic, adversarial scan of a branch (or scoped path) for design problems, type-safety bypasses, and toolchain-mismatch bugs in this Bun + Elysia + Drizzle repo. Run on demand mid-branch. Not a PR review; does not gate anything.
---

# /adversarial-review

A forensic, adversarial scan. Not a PR review. Does not gate merging or commits.

**Bias**: treat every finding as a real bug until disproven. Be specific about what is wrong and what to do instead. No softeners ("overall this looks good", "mostly fine"). No "consider" / "you might want to" hedges — say what is broken and what should change.

## Invocation

- `/adversarial-review` — scan `git diff main...HEAD` plus the working tree (uncommitted changes included).
- `/adversarial-review <path>` — scoped scan of the given file or directory. Useful for reviewing one module mid-branch.

Repeatable. Run as many times as the branch evolves.

## Output, in this fixed order

Render every section every time, even if a section's body is "none". Skipping a section is a bug in the review.

### 1. Change summary

Plain-English: what the branch sets out to do, the new control and data flow, key files and functions touched. This goes first so the user can sanity-check whether the reviewing agent even understood the change. If the summary is wrong, the rest is unreliable — and that itself is a finding.

### 2. Design critique

Adversarial questions about the choices. For each, either say "no concern" with one line of evidence, or describe the specific problem. Do not skip.

- Is this abstraction earned, or premature? Three duplicated lines is fine.
- Is the parse / validate boundary in the right place? Are we validating once at the edge and trusting types inside, or re-validating in the middle and lying at the edge?
- Do names describe actual behavior, or aspirational behavior? Does `fetchUser` actually fetch a user, or does it return a maybe-user-shaped object pulled from a cache that may be stale?
- Hidden state, hidden I/O, hidden async, hidden retries?
- Errors-thrown vs results-returned: consistent within the module? Consistent with the rest of the codebase?
- Is the seam testable, or does testing it require mocking the world?
- Does it re-implement something that already exists in the repo or in a dependency?
- Does it defer a hard problem behind a `TODO`, a sentinel default (`?? []`, `?? {}`, `?? ""`), or a mock that escaped the test directory?
- Coupling: did it merge concerns that should stay split, or split things that need to move together?

### 3. Type-safety bypasses

Scan for and list every instance of:

- `any` (explicit or implicit via missing annotations on public surface)
- `as` casts — especially `as unknown as T` and `as any`
- `!` non-null assertions
- `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `@ts-check` (should be zero — flag any as a policy violation)
- `oxlint-disable*`, `eslint-disable*` (same)
- Unparsed boundary data: `JSON.parse(...)` whose result is used without schema validation; `fetch(...).json()` typed via `as`; env-var reads without parsing
- Non-exhaustive switches over discriminated unions (no `default` that calls `assertNever`)
- Sentinel defaults that mask nullability (`?? []`, `?? {}`, `?? 0`) where the missing case is semantically different from the empty case
- Fake parsers: `JSON.parse(input) as T`, `data as MySchema`
- `catch` blocks without `err: unknown` narrowing, or that swallow errors
- `Object.keys` / `Object.entries` / `Object.values` results used as if the key type were narrow (it is `string`, not `keyof T`)
- Optional chaining (`?.`) on values that the code's logic says should never be null — masks invariant violations
- Mocks or stubs leaking out of `*.test.ts` into production paths
- `TODO` / `FIXME` comments on types
- `async` functions with no `await` (the `async` is a lie about the return type)

### 4. Toolchain-mismatch bugs

Express/Node/Prisma idioms that snuck into Elysia/Bun/Drizzle code:

- Broken Elysia inference chains — instances assigned to loose `Elysia` variables mid-build; `let app: Elysia = …; app = app.get(...)`; route handlers typed as `(req, res) => …`.
- `dotenv` imports or `dotenv.config()` calls.
- `__dirname` / `__filename` in ESM files (these are CJS-only).
- `require(...)` calls in ESM source.
- Jest-style mocks: `jest.fn`, `jest.mock`, `jest.spyOn`. We use `bun:test`.
- Prisma-shaped queries (`prisma.user.findUnique({ include: { ... } })`) inside Drizzle code, or hand-written row interfaces instead of `$inferSelect`.
- `drizzle-kit push` invocations in production code paths or Docker / boot scripts.
- `res.send` / `res.json` / `res.status(...).send(...)` patterns inside Elysia handlers.
- Mixing `@sinclair/typebox` and `typebox` (1.x) imports in the same file. The latter is reserved for `@mariozechner/pi-ai` tool schemas only.
- `npm` / `pnpm` / `yarn` / `npx` / `node` / `ts-node` invocations in scripts.

### 5. Findings table

A single table, sorted by severity (high → low). One row per finding. No commentary outside the table — every concrete bug from sections 2, 3, 4 has a row here.

| file:line | severity | category | why it's a problem | concrete fix |
| --------- | -------- | -------- | ------------------ | ------------ |

Severity scale:

- **high** — bug, security issue, data loss risk, or violation of an explicit policy in `docs/type-safety-policy.md`.
- **medium** — incorrect type or misuse of an API; not yet broken but will break the next time someone changes nearby code.
- **low** — style, smell, missed opportunity.

Do **not** write an "overall looks good" summary, an "executive summary", or a closing paragraph after the table. The table ends the review.

## Notes for the reviewing agent

- The disable-comment ban is absolute. If the diff adds one, it is a high-severity finding regardless of justification — the policy is that the user, not an agent, accepts exceptions, and exceptions only live in `docs/type-safety-policy.md`.
- The `assertNever` helper lives at `src/util/assert-never.ts`. Any discriminated-union switch without it in `default:` is a finding.
- Branded ID types: a `string` passed where a `UserId` is expected is a high-severity finding even if it compiles, because it means the brand was peeled off via `as`.
- "I asked the user before doing X" is not a justification for any finding in the diff; review the code, not the conversation.
