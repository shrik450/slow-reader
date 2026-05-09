# Developing

## Prerequisites

- [Bun](https://bun.sh) 1.3 or later

## Setup

```sh
git clone <repo>
cd slow-reader
bun install
cp .env.example .env   # adjust if you want
```

`bun install` runs the `prepare` script, which sets
`git config core.hooksPath .githooks` so the pre-commit hook is active in your
clone.

## Running

```sh
bun run dev      # hot-reloading server on http://localhost:3000
bun start        # production-style: no reload
```

`/health` returns `{"status":"ok"}` once the server is up.

Environment variables (Bun auto-loads `.env`):

- `PORT` — default `3000`

## Testing

```sh
bun test                                # all tests
bun test src/index.test.ts              # single file
bun test -t "returns ok"                # filter by test name
```

Tests use `bun:test` (Jest-compatible API). Co-locate test files next to the
code they cover, named `*.test.ts`.

For Elysia routes, prefer `app.handle(new Request(url))` over spinning up a real
server. The `app` export and `if (import.meta.main)` guard in `src/index.ts`
exist precisely so tests can import without booting.

## Linting and formatting

We use [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[oxfmt](https://oxc.rs/docs/guide/usage/formatter).

```sh
bun run lint           # oxlint
bun run format         # apply oxfmt
bun run format:check   # CI/pre-commit check
bun run typecheck      # tsc --noEmit
```

The pre-commit hook runs `lint` and `format:check`. To bypass it for a WIP
commit, `git commit --no-verify`. CI runs the same checks, so don't push without
fixing.

## Project layout

```
src/             application code
  index.ts       Elysia app + server bootstrap
.githooks/       tracked git hooks (pre-commit)
.github/         CI workflow
```

## Docker

Bare minimum runtime:

```sh
docker compose up --build
```

This builds the image and runs the app.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

1. `bun install --frozen-lockfile`
1. `bun run lint`
1. `bun run format:check`
1. `bun run typecheck`
1. `bun test`

If a check fails locally that passes in CI (or vice versa), check the pinned Bun
version in the workflow against your local `bun --version`.

## A note on RDD

This project follows Readme Driven Development: `README.md` describes target
features, not what's implemented. When picking up a feature from the README, do
not assume the codebase has it.
