import { Elysia } from "elysia";

export const app = new Elysia().get("/health", () => ({ status: "ok" }));

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port);

  console.log(`slow-reader listening on http://${app.server?.hostname}:${app.server?.port}`);
}
