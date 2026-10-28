/**
 * Route security / denied-mutation proofs.
 * Uses fixtures — never calls live Hugging Face or Replicate.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_BODY_BYTES,
  resetApiGuardForTests,
  setRateLimitMaxForTests,
} from "@/utils/api-guard";
import { DEFAULT_CHAT_MODEL } from "@/utils/models";
import { GET, POST } from "./route";

const TEST_API_SECRET = "test-only-hf-api-secret";

function postJson(type: string, body: unknown, headers?: Record<string, string>) {
  return POST(
    new Request(`http://localhost/api/hf?type=${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/hf denial and fixtures", () => {
  const prevFixture = process.env.HF_USE_FIXTURES;
  const prevToken = process.env.HF_TOKEN;
  const prevSecret = process.env.HF_API_SECRET;
  const prevReplicate = process.env.REPLICATE_API_TOKEN;

  beforeEach(() => {
    resetApiGuardForTests();
    process.env.HF_USE_FIXTURES = "true";
    delete process.env.HF_TOKEN;
    delete process.env.HF_API_SECRET;
  });

  afterEach(() => {
    resetApiGuardForTests();
    if (prevFixture === undefined) delete process.env.HF_USE_FIXTURES;
    else process.env.HF_USE_FIXTURES = prevFixture;
    if (prevToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = prevToken;
    if (prevSecret === undefined) delete process.env.HF_API_SECRET;
    else process.env.HF_API_SECRET = prevSecret;
    if (prevReplicate === undefined) delete process.env.REPLICATE_API_TOKEN;
    else process.env.REPLICATE_API_TOKEN = prevReplicate;
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

  it("refuses live calls when HF_API_SECRET is unset (503)", async () => {
    process.env.HF_USE_FIXTURES = "false";
    const res = await postJson("comp", { message: "hello" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Live inference is disabled");
    expect(JSON.stringify(body)).not.toMatch(/HF_TOKEN|REPLICATE/);
  });

  it("requires the shared secret when HF_API_SECRET is set", async () => {
    process.env.HF_API_SECRET = TEST_API_SECRET;
    const missing = await postJson("comp", { message: "hello" });
    expect(missing.status).toBe(401);

    const wrong = await postJson("comp", { message: "hello" }, {
      "x-hf-api-key": "not-the-secret",
    });
    expect(wrong.status).toBe(401);

    const bearer = await postJson("comp", { message: "hello" }, {
      Authorization: `Bearer ${TEST_API_SECRET}`,
    });
    expect(bearer.status).toBe(200);
    const body = await bearer.json();
    expect(body.fixture).toBe(true);
  });

  it("rejects models outside the catalog (400)", async () => {
    const res = await postJson("comp", {
      message: "hello",
      model: "org/not-in-catalog",
    });
    expect(res.status).toBe(400);
  });

  it("rejects oversized max_tokens (400)", async () => {
    const res = await postJson("comp", {
      message: "hello",
      model: DEFAULT_CHAT_MODEL,
      max_tokens: 9_000_000,
    });
    expect(res.status).toBe(400);
  });

  it("rejects a cross-origin browser request (403)", async () => {
    const res = await POST(
      new Request("http://localhost/api/hf?type=comp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
        body: JSON.stringify({ message: "hello" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("rejects an oversized content-length (413)", async () => {
    const res = await POST(
      new Request("http://localhost/api/hf?type=comp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(MAX_BODY_BYTES + 1),
        },
        body: JSON.stringify({ message: "hello" }),
      })
    );
    expect(res.status).toBe(413);
  });

  it("rejects invalid JSON with a fixed 400 message", async () => {
    const res = await POST(
      new Request("http://localhost/api/hf?type=comp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("rejects a non-file image field (400)", async () => {
    const form = new FormData();
    form.set("image", "not-a-file");
    const res = await POST(
      new Request("http://localhost/api/hf?type=imgtt", { method: "POST", body: form })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Image file is required");
  });

  it("rejects a non-image upload (400)", async () => {
    const form = new FormData();
    form.set("image", new File([new Uint8Array([1])], "notes.txt", { type: "text/plain" }));
    const res = await POST(
      new Request("http://localhost/api/hf?type=imgtt", { method: "POST", body: form })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Unsupported image type");
  });

  it("accepts a png upload in fixture mode", async () => {
    const form = new FormData();
    form.set("image", new File([new Uint8Array([1, 2, 3])], "dot.png", { type: "image/png" }));
    const res = await POST(
      new Request("http://localhost/api/hf?type=imgtt", { method: "POST", body: form })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fixture).toBe(true);
  });

  it("hides internal provider errors on live failure (500)", async () => {
    process.env.HF_USE_FIXTURES = "false";
    process.env.HF_API_SECRET = TEST_API_SECRET;
    delete process.env.REPLICATE_API_TOKEN;
    const form = new FormData();
    form.set("image", new File([new Uint8Array([1, 2, 3])], "dot.png", { type: "image/png" }));
    const res = await POST(
      new Request("http://localhost/api/hf?type=imgtt", {
        method: "POST",
        headers: { "x-hf-api-key": TEST_API_SECRET },
        body: form,
      })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("An unexpected error occurred");
    expect(JSON.stringify(body)).not.toMatch(/TOKEN|arrayBuffer|not set/i);
  });

  it("rate-limits repeated calls (429)", async () => {
    setRateLimitMaxForTests(1);
    const first = await postJson("comp", { message: "hello" });
    expect(first.status).toBe(200);
    const second = await postJson("comp", { message: "hello again" });
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("GET /api/hf", () => {
  it("denies GET with 405", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
