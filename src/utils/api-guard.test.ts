import { afterEach, describe, expect, it } from "vitest";
import { DEMO_PASSWORD_MESSAGE } from "./demo-password";
import {
  guardApiRequest,
  resetApiGuardForTests,
  setRateLimitMaxForTests,
} from "./api-guard";

describe("guardApiRequest", () => {
  const prevFixture = process.env.HF_USE_FIXTURES;
  const prevSecret = process.env.HF_API_SECRET;

  afterEach(() => {
    resetApiGuardForTests();
    if (prevFixture === undefined) delete process.env.HF_USE_FIXTURES;
    else process.env.HF_USE_FIXTURES = prevFixture;
    if (prevSecret === undefined) delete process.env.HF_API_SECRET;
    else process.env.HF_API_SECRET = prevSecret;
  });

  it("asks for the demo password when the shared secret is missing or wrong", async () => {
    resetApiGuardForTests();
    process.env.HF_USE_FIXTURES = "false";
    process.env.HF_API_SECRET = "test-only-hf-api-secret";
    const missing = guardApiRequest(
      new Request("http://localhost/api/hf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    );
    expect(missing?.status).toBe(401);
    expect(await missing?.json()).toEqual({ error: DEMO_PASSWORD_MESSAGE });

    const wrong = guardApiRequest(
      new Request("http://localhost/api/hf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hf-api-key": "not-the-secret",
        },
        body: "{}",
      })
    );
    expect(wrong?.status).toBe(401);
    const wrongBody = await wrong?.json();
    expect(wrongBody).toEqual({ error: DEMO_PASSWORD_MESSAGE });
    expect(JSON.stringify(wrongBody)).not.toMatch(/Unauthorized/);
  });

  it("allows fixture mode without a shared secret", () => {
    resetApiGuardForTests();
    process.env.HF_USE_FIXTURES = "true";
    delete process.env.HF_API_SECRET;
    expect(
      guardApiRequest(
        new Request("http://localhost/api/hf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      )
    ).toBeNull();
  });

  it("counts requests toward the rate limit", () => {
    resetApiGuardForTests();
    setRateLimitMaxForTests(1);
    process.env.HF_USE_FIXTURES = "true";
    delete process.env.HF_API_SECRET;
    const request = () =>
      new Request("http://localhost/api/hf", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.5" },
        body: "{}",
      });
    expect(guardApiRequest(request())).toBeNull();
    const limited = guardApiRequest(request());
    expect(limited?.status).toBe(429);
  });
});
