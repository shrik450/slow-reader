import { describe, expect, test } from "bun:test";
import { app } from "./index.ts";

describe("GET /health", () => {
  test("returns ok", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
