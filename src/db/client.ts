import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.ts";

export type Db = BunSQLiteDatabase<typeof schema>;

export function createDb(url: string): Db {
  if (url !== ":memory:") {
    mkdirSync(dirname(url), { recursive: true });
  }
  const sqlite = new Database(url);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  return drizzle(sqlite, { schema });
}

export function defaultDb(): Db {
  return createDb(process.env.DATABASE_URL ?? "./data/slow-reader.db");
}
