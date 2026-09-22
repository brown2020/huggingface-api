/**
 * Route security / denied-mutation proofs.
 * Uses fixtures — never calls live Hugging Face or Replicate.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";

describe("POST /api/hf denial and fixtures", () => {
  const prevFixture = process.env.HF_USE_FIXTURES;
  const prevToken = process.env.HF_TOKEN;

  beforeEach(() => {
    process.env.HF_USE_FIXTURES = "true";
    delete process.env.HF_TOKEN;
  });

  afterEach(() => {
    if (prevFixture === undefined) delete process.env.HF_USE_FIXTURES;
    else process.env.HF_USE_FIXTURES = prevFixture;
    if (prevToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = prevToken;
  });

  it("rejects invalid type parameter (400)", async () => {
    const res = await POST(
      new Request("http://localhost/api/hf?type=not-a-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "x" }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("rejects empty completion message (400)", async () => {
    const res = await POST(
      new Request("http://localhost/api/hf?type=comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns labeled fixture for completion without HF_TOKEN", async () => {
    const res = await POST(
      new Request("http://localhost/api/hf?type=comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello fixture" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fixture).toBe(true);
    expect(String(body.message)).toContain("[fixture]");
  });

  it("returns fixture PNG for text-to-image", async () => {
    const res = await POST(
      new Request("http://localhost/api/hf?type=ttpng", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "a red cube" }),
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-HF-Fixture")).toBe("true");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0x89);
  });
});

describe("GET /api/hf", () => {
  it("denies GET with 405", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
