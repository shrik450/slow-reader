import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { defaultDb, type Db } from "./client.ts";

const MIGRATIONS_FOLDER = "./drizzle";

export function runMigrations(db: Db): void {
  if (!existsSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`)) {
    console.log("[db] no migrations to apply");
    return;
  }
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

if (import.meta.main) {
  runMigrations(defaultDb());
  console.log("[db] migrations applied");
}
