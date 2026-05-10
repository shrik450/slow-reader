import { Elysia } from "elysia";
import { defaultDb, type Db } from "./db/client.ts";
import { runMigrations } from "./db/migrate.ts";

export function createApp({ db }: { db: Db }) {
  return new Elysia().decorate("db", db).get("/health", () => ({ status: "ok" }));
}

if (import.meta.main) {
  const db = defaultDb();
  runMigrations(db);
  const app = createApp({ db });
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port);

  console.log(`slow-reader listening on http://${app.server?.hostname}:${app.server?.port}`);
}
