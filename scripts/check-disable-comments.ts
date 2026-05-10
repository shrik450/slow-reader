#!/usr/bin/env -S bun run
import { $ } from "bun";

const args = Bun.argv.slice(2);
const diffArgs = args.length > 0 ? args : ["--cached"];

const fileGlobs = ["*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs"];
const disablePattern = /@ts-ignore|@ts-expect-error|@ts-nocheck|oxlint-disable|eslint-disable/;

// Ignore the scripts/ directory
const diff =
  await $`git diff ${diffArgs} --no-color --unified=0 -- ${fileGlobs} ':!scripts/*'`.text();

const offending = diff
  .split("\n")
  .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
  .filter((line) => disablePattern.test(line));

if (offending.length > 0) {
  console.error("ERROR: diff introduces a forbidden type/lint disable comment:");
  for (const line of offending) console.error(line);
  console.error("");
  console.error(
    "See docs/type-safety-policy.md. Approved exceptions live there; agents do not add them.",
  );
  process.exit(1);
}
