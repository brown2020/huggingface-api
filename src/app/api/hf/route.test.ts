/**
 * Route security / denied-mutation proofs.
 * Uses fixtures — never calls live Hugging Face or Replicate.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_BODY_BYTES,
  resetApiGuardForTests,
  setRateLimitMaxForTests,
} from "@/utils/api-guard";
import {
  HF_AUTH_MESSAGE,
  HF_CREDITS_MESSAGE,
  HF_UNAVAILABLE_MESSAGE,
} from "@/utils/hf-errors";
import {
  FIXTURE_COMPLETION,
  FIXTURE_TRANSLATION,
} from "@/utils/hf-fixtures";
import { DEMO_PASSWORD_MESSAGE } from "@/utils/demo-password";
import { DEFAULT_CHAT_MODEL } from "@/utils/models";
import * as replicateMod from "@/utils/replicate";
import { GET, POST } from "./route";

const PLANTED_TOKEN = "hf_TESTTOKENSHOULDNOTLEAK";

const hfMocks = vi.hoisted(() => ({
  chatCompletion: vi.fn(),
  textToImage: vi.fn(),
}));

vi.mock("@/utils/hf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/hf")>();
  return {
    ...actual,
    hfChatCompletion: (...args: unknown[]) => hfMocks.chatCompletion(...args),
    hfTextToImage: (...args: unknown[]) => hfMocks.textToImage(...args),
  };
});

function providerError(status: number, bodyText: string) {
  const error = new Error(`Failed to perform inference: ${bodyText} ${PLANTED_TOKEN}`);
  error.name = "InferenceClientProviderApiError";
  return Object.assign(error, {
    httpRequest: {
      url: "https://router.huggingface.co/v1/chat/completions",
      method: "POST",
      headers: { Authorization: `Bearer ${PLANTED_TOKEN}` },
    },
    httpResponse: {
      requestId: "req_test",
      status,
      body: { error: bodyText, token: PLANTED_TOKEN },
    },
  });
}

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
    expect(body.demoData).toBe(true);
    expect(body.notice).toBeUndefined();
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
    expect(res.headers.get("X-HF-Demo-Data")).toBe("true");
    expect(res.headers.get("X-HF-Notice")).toBeNull();
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
    expect(await missing.json()).toEqual({ error: DEMO_PASSWORD_MESSAGE });

    const wrong = await postJson("comp", { message: "hello" }, {
      "x-hf-api-key": "not-the-secret",
    });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ error: DEMO_PASSWORD_MESSAGE });

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

  it("returns the caption sample when LLaVA throws", async () => {
    process.env.HF_USE_FIXTURES = "false";
    process.env.HF_API_SECRET = TEST_API_SECRET;
    delete process.env.REPLICATE_API_TOKEN;
    const thrown = new Error(`REPLICATE_API_TOKEN is not set ${PLANTED_TOKEN}`);
    thrown.name = "ApiError";
    const replicate = vi
      .spyOn(replicateMod, "captionWithLlava13bUrl")
      .mockRejectedValue(thrown);
    const form = new FormData();
    form.set("image", new File([new Uint8Array([1, 2, 3])], "dot.png", { type: "image/png" }));
    const res = await POST(
      new Request("http://localhost/api/hf?type=imgtt", {
        method: "POST",
        headers: { "x-hf-api-key": TEST_API_SECRET },
        body: form,
      })
    );
    expect(replicate).toHaveBeenCalledOnce();
    expect(hfMocks.chatCompletion).not.toHaveBeenCalled();
    expect(hfMocks.textToImage).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fixture).toBe(true);
    expect(body.demoData).toBe(true);
    expect(body.notice).toBe(HF_UNAVAILABLE_MESSAGE);
    expect(JSON.stringify(body)).not.toContain(PLANTED_TOKEN);
    expect(JSON.stringify(body)).not.toMatch(/TOKEN|arrayBuffer|not set/i);
    replicate.mockRestore();
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

describe("POST /api/hf upstream Hugging Face failures", () => {
  const prevFixture = process.env.HF_USE_FIXTURES;
  const prevToken = process.env.HF_TOKEN;
  const prevSecret = process.env.HF_API_SECRET;

  beforeEach(() => {
    resetApiGuardForTests();
    process.env.HF_USE_FIXTURES = "false";
    process.env.HF_API_SECRET = TEST_API_SECRET;
    process.env.HF_TOKEN = "hf_not_a_real_token";
    hfMocks.chatCompletion.mockReset();
    hfMocks.chatCompletion.mockRejectedValue(new Error("unexpected hf chat call"));
    hfMocks.textToImage.mockReset();
    hfMocks.textToImage.mockRejectedValue(new Error("unexpected hf image call"));
  });

  afterEach(() => {
    resetApiGuardForTests();
    if (prevFixture === undefined) delete process.env.HF_USE_FIXTURES;
    else process.env.HF_USE_FIXTURES = prevFixture;
    if (prevToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = prevToken;
    if (prevSecret === undefined) delete process.env.HF_API_SECRET;
    else process.env.HF_API_SECRET = prevSecret;
    vi.restoreAllMocks();
  });

  function liveJson(type: string, body: unknown) {
    return postJson(type, body, { "x-hf-api-key": TEST_API_SECRET });
  }

  it("keeps the shared-secret check ahead of any provider call", async () => {
    const res = await postJson("comp", { message: "hello" });
    expect(res.status).toBe(401);
    expect(hfMocks.chatCompletion).not.toHaveBeenCalled();
  });

  it("falls back to a completion fixture when credits are used up", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    hfMocks.chatCompletion.mockRejectedValue(
      providerError(402, "You have no remaining credits")
    );
    const res = await liveJson("comp", { message: "hello" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      message: FIXTURE_COMPLETION,
      fixture: true,
      demoData: true,
      notice: HF_CREDITS_MESSAGE,
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(PLANTED_TOKEN);
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("remaining credits");
    expect(logged.mock.calls.flat().join(" ")).not.toContain(PLANTED_TOKEN);
  });

  it("falls back when a 403 body says credits are gone", async () => {
    hfMocks.chatCompletion.mockRejectedValue(
      providerError(403, "You have no remaining credits")
    );
    const res = await liveJson("translation", { text: "hello" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe(FIXTURE_TRANSLATION);
    expect(body.demoData).toBe(true);
    expect(body.notice).toBe(HF_CREDITS_MESSAGE);
    expect(JSON.stringify(body)).not.toContain(PLANTED_TOKEN);
  });

  it("tries Hugging Face, then returns the sample when the token is rejected", async () => {
    hfMocks.chatCompletion.mockRejectedValue(providerError(401, "Invalid credentials"));
    const res = await liveJson("comp", { message: "hello" });
    expect(hfMocks.chatCompletion).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fixture).toBe(true);
    expect(body.demoData).toBe(true);
    expect(body.notice).toBeUndefined();
    expect(String(body.message)).toContain("[fixture]");
    expect(JSON.stringify(body)).not.toContain(PLANTED_TOKEN);
  });

  it("returns JSON for a 403 that is not a credit or quota failure", async () => {
    hfMocks.chatCompletion.mockRejectedValue(providerError(403, "Forbidden"));
    const res = await liveJson("comp", { message: "hello" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: HF_AUTH_MESSAGE });
    expect(JSON.stringify(body)).not.toContain(PLANTED_TOKEN);
  });

  it("falls back when the body says the quota is exceeded", async () => {
    hfMocks.chatCompletion.mockRejectedValue(
      providerError(403, "You have exceeded quota for this account")
    );
    const res = await liveJson("comp", { message: "hello" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.demoData).toBe(true);
    expect(body.notice).toBe(HF_CREDITS_MESSAGE);
    expect(JSON.stringify(body)).not.toContain(PLANTED_TOKEN);
    expect(JSON.stringify(body)).not.toContain("exceeded quota");
  });

  it("returns the sample when Hugging Face rate limits, returns 503, or times out", async () => {
    hfMocks.chatCompletion.mockRejectedValue(providerError(429, "Too Many Requests"));
    const limited = await liveJson("comp", { message: "hello" });
    expect(limited.status).toBe(200);
    const limitedBody = await limited.json();
    expect(limitedBody.demoData).toBe(true);
    expect(limitedBody.notice).toBeUndefined();
    expect(JSON.stringify(limitedBody)).not.toContain(PLANTED_TOKEN);

    hfMocks.chatCompletion.mockRejectedValue(providerError(503, "unavailable"));
    const down = await liveJson("comp", { message: "hello again" });
    expect(down.status).toBe(200);
    const downBody = await down.json();
    expect(downBody.demoData).toBe(true);
    expect(JSON.stringify(downBody)).not.toContain("unavailable");

    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    hfMocks.chatCompletion.mockRejectedValue(timeout);
    const timed = await liveJson("comp", { message: "hello once more" });
    expect(timed.status).toBe(200);
    const timedBody = await timed.json();
    expect(timedBody.demoData).toBe(true);
    expect(JSON.stringify(timedBody)).not.toContain("aborted");
  });

  it("keeps a non-503 upstream failure as JSON", async () => {
    hfMocks.chatCompletion.mockRejectedValue(providerError(502, "bad gateway"));
    const res = await liveJson("comp", { message: "hello" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: HF_UNAVAILABLE_MESSAGE });
  });

  it("calls Hugging Face when fixture mode is off", async () => {
    delete process.env.HF_USE_FIXTURES;
    hfMocks.chatCompletion.mockResolvedValue({
      choices: [{ message: { content: "live answer" } }],
    });
    const res = await liveJson("comp", { message: "hello" });
    expect(hfMocks.chatCompletion).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ message: "live answer" });
  });

  it("hides an unclassified provider body", async () => {
    hfMocks.chatCompletion.mockRejectedValue(
      providerError(400, "model not supported")
    );
    const res = await liveJson("comp", { message: "hello" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "An unexpected error occurred" });
    expect(JSON.stringify(body)).not.toContain(PLANTED_TOKEN);
    expect(JSON.stringify(body)).not.toMatch(/not supported|Bearer/i);
  });

  it("returns the fixture PNG and demo headers for a text-to-image credit failure", async () => {
    hfMocks.textToImage.mockRejectedValue(
      providerError(402, "You have no remaining credits")
    );
    const res = await liveJson("ttpng", { prompt: "a red cube" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-HF-Fixture")).toBe("true");
    expect(res.headers.get("X-HF-Demo-Data")).toBe("true");
    expect(res.headers.get("X-HF-Notice")).toBe(HF_CREDITS_MESSAGE);
    expect(res.headers.get("X-HF-Notice")).not.toContain(PLANTED_TOKEN);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0x89);
    expect(buf.toString("utf8")).not.toContain(PLANTED_TOKEN);
  });

  it("falls back to a caption fixture when LLaVA hits an upstream credit error", async () => {
    const replicate = vi
      .spyOn(replicateMod, "captionWithLlava13bUrl")
      .mockRejectedValue(replicateApiError(402, "You have no remaining credits"));
    const form = new FormData();
    form.set(
      "image",
      new File([new Uint8Array([1, 2, 3])], "dot.png", { type: "image/png" })
    );
    const res = await POST(
      new Request("http://localhost/api/hf?type=imgtt", {
        method: "POST",
        headers: { "x-hf-api-key": TEST_API_SECRET },
        body: form,
      })
    );
    expect(replicate).toHaveBeenCalledOnce();
    const imageUrl = replicate.mock.calls[0]?.[0]?.imageUrl;
    expect(imageUrl?.startsWith("data:image/png;base64,")).toBe(true);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fixture).toBe(true);
    expect(body.demoData).toBe(true);
    expect(body.notice).toBe(HF_CREDITS_MESSAGE);
    expect(JSON.stringify(body)).not.toContain(PLANTED_TOKEN);
  });

  it("returns the LLaVA caption when Replicate succeeds", async () => {
    const replicate = vi
      .spyOn(replicateMod, "captionWithLlava13bUrl")
      .mockResolvedValue("a red cube on a table");
    const form = new FormData();
    form.set(
      "image",
      new File([pngBytes()], "cube.png", { type: "image/png" })
    );
    const res = await POST(
      new Request("http://localhost/api/hf?type=imgtt", {
        method: "POST",
        headers: { "x-hf-api-key": TEST_API_SECRET },
        body: form,
      })
    );
    expect(replicate).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "a red cube on a table",
      note: "No HF Inference provider available for this HF model; using Replicate LLaVA-13B via REPLICATE_API_TOKEN.",
    });
  });

  it("returns the caption sample and demo notice for Replicate LLaVA failures", async () => {
    const replicate = vi.spyOn(replicateMod, "captionWithLlava13bUrl");
    const form = () => {
      const body = new FormData();
      body.set(
        "image",
        new File([pngBytes()], "dot.png", { type: "image/png" })
      );
      return body;
    };
    const postImage = () =>
      POST(
        new Request("http://localhost/api/hf?type=imgtt", {
          method: "POST",
          headers: { "x-hf-api-key": TEST_API_SECRET },
          body: form(),
        })
      );

    for (const status of [403, 404, 410, 500, 502]) {
      replicate.mockRejectedValue(replicateApiError(status, "model unavailable"));
      const res = await postImage();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.fixture).toBe(true);
      expect(body.demoData).toBe(true);
      expect(body.notice).toBe(
        status === 403 ? HF_AUTH_MESSAGE : HF_UNAVAILABLE_MESSAGE
      );
      expect(JSON.stringify(body)).not.toContain(PLANTED_TOKEN);
      expect(JSON.stringify(body)).not.toContain("model unavailable");
    }

    replicate.mockRejectedValue(
      replicateApiError(404, "request failed")
    );
    const fromApiError = await postImage();
    expect(fromApiError.status).toBe(200);
    const apiBody = await fromApiError.json();
    expect(apiBody.demoData).toBe(true);
    expect(apiBody.notice).toBe(HF_UNAVAILABLE_MESSAGE);

    replicate.mockRejectedValue(new Error("REPLICATE_API_TOKEN is not set"));
    const missingToken = await postImage();
    expect(missingToken.status).toBe(200);
    const missingBody = await missingToken.json();
    expect(missingBody.fixture).toBe(true);
    expect(missingBody.demoData).toBe(true);
    expect(missingBody.notice).toBe(HF_UNAVAILABLE_MESSAGE);
    expect(JSON.stringify(missingBody)).not.toContain("REPLICATE_API_TOKEN");

    replicate.mockRejectedValue(new Error("model is unavailable"));
    const thrown = await postImage();
    expect(thrown.status).toBe(200);
    const thrownBody = await thrown.json();
    expect(thrownBody.fixture).toBe(true);
    expect(thrownBody.notice).toBe(HF_UNAVAILABLE_MESSAGE);
    expect(JSON.stringify(thrownBody)).not.toContain("model is unavailable");
  });
});

function replicateApiError(status: number, bodyText: string) {
  const error = new Error(`Request failed: ${bodyText}`);
  error.name = "ApiError";
  return Object.assign(error, {
    response: { status },
  });
}

function pngBytes() {
  return Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    )
  );
}

describe("GET /api/hf", () => {
  it("denies GET with 405", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
