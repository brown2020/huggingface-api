import { NextResponse } from "next/server";
import { guardApiRequest } from "@/utils/api-guard";
import { getBestProvider, canonicalizeModelId, hfChatCompletion, hfTextToImage } from "@/utils/hf";
import {
  FIXTURE_COMPLETION,
  FIXTURE_IMAGE_CAPTION,
  FIXTURE_TRANSLATION,
  fixturePngBuffer,
  hfFixturesEnabled,
  savedFixturesExist,
} from "@/utils/hf-fixtures";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
} from "@/utils/models";
import {
  DEMO_DATA_HEADER,
  HF_CREDITS_MESSAGE,
  NOTICE_HEADER,
  classifyUpstreamFailure,
  headerSafeReason,
  scrubPublicErrorText,
} from "@/utils/hf-errors";
import { HttpError } from "@/utils/http-error";
import {
  imageResponseContentType,
  requireImageFile,
} from "@/utils/image-file";
import { captionWithLlava13bUrl } from "@/utils/replicate";
import {
  chatSchema,
  textToImageSchema,
  translationSchema,
  typeSchema,
} from "@/utils/validation";

export const runtime = "nodejs";

type HfRouteType = "comp" | "translation" | "imgtt" | "ttpng";

type ApiErrorPayload = { error: string };

/** Flatten HF / Zod / unknown errors into a clean user-facing string. */
function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message || "Unknown error";
    // HF client sometimes embeds JSON in the message
    try {
      const parsed = JSON.parse(msg) as { error?: unknown; message?: unknown };
      if (typeof parsed.error === "string") return parsed.error;
      if (typeof parsed.message === "string") return parsed.message;
    } catch {
      /* not JSON */
    }
    return msg;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unexpected error occurred";
  }
}

function jsonError(status: number, error: unknown) {
  return NextResponse.json<ApiErrorPayload>(
    { error: scrubPublicErrorText(formatErrorMessage(error)) },
    { status }
  );
}

function sampleResponse(type: HfRouteType, notice?: string): Response {
  const safeNotice = notice ? headerSafeReason(notice) : "";
  if (type === "ttpng") {
    const buffer = fixturePngBuffer();
    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Content-Disposition": "inline; filename=fixture-image.png",
      "X-HF-Fixture": "true",
      [DEMO_DATA_HEADER]: "true",
    };
    if (safeNotice) headers[NOTICE_HEADER] = safeNotice;
    return new Response(new Uint8Array(buffer), { status: 200, headers });
  }

  const message =
    type === "translation"
      ? FIXTURE_TRANSLATION
      : type === "imgtt"
        ? FIXTURE_IMAGE_CAPTION
        : FIXTURE_COMPLETION;

  return NextResponse.json({
    message,
    fixture: true,
    demoData: true,
    ...(type === "imgtt" && !safeNotice
      ? { note: "Fixture mode — Replicate not called." }
      : {}),
    ...(safeNotice ? { notice: safeNotice } : {}),
  });
}

function logUpstreamFailure(
  error: unknown,
  failure: { kind: string; status: number } | null
) {
  console.error("hf upstream failure", {
    name: error instanceof Error ? error.name : "non-error",
    kind: failure?.kind ?? "unknown",
    status: failure?.status ?? null,
  });
}

function getContentType(request: Request) {
  return request.headers.get("content-type") ?? "";
}

async function readBodyAsObject(request: Request) {
  const contentType = getContentType(request);
  if (contentType.includes("application/json")) {
    try {
      return (await request.json()) as unknown;
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }
  }
  // Backwards compatibility for older clients using multipart for all requests.
  try {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid form body");
  }
}

async function handleCompletion(request: Request) {
  const body = await readBodyAsObject(request);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.flatten());

  if (hfFixturesEnabled()) {
    return sampleResponse("comp");
  }

  const { message, max_tokens, model } = parsed.data;
  const modelId = canonicalizeModelId(model || DEFAULT_CHAT_MODEL);
  const provider = getBestProvider(modelId, "chatCompletion");

  const out = await hfChatCompletion({
    model: modelId,
    messages: [{ role: "user", content: message }],
    max_tokens: max_tokens || 1000,
    provider,
  });

  return NextResponse.json({ message: out.choices[0]?.message?.content ?? "" });
}

async function handleTranslation(request: Request) {
  const body = await readBodyAsObject(request);
  const parsed = translationSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.flatten());

  if (hfFixturesEnabled()) {
    return sampleResponse("translation");
  }

  const { text, targetLang, model } = parsed.data;
  const modelId = canonicalizeModelId(model || DEFAULT_CHAT_MODEL);
  const provider = getBestProvider(modelId, "chatCompletion");

  const out = await hfChatCompletion({
    model: modelId,
    messages: [
      {
        role: "user",
        content: `Translate the following text to ${
          targetLang || "French"
        }: "${text}"`,
      },
    ],
    max_tokens: 1000,
    provider,
  });

  return NextResponse.json({ message: out.choices[0]?.message?.content ?? "" });
}

async function handleImageToText(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new HttpError(400, "Invalid form body");
  }
  const imageFile = requireImageFile(formData.get("image"));
  const mediaType = imageResponseContentType(imageFile.type);

  if (hfFixturesEnabled()) {
    return sampleResponse("imgtt");
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${mediaType};base64,${base64}`;

  const output = await captionWithLlava13bUrl({ imageUrl: dataUrl });
  return NextResponse.json({
    message: output,
    note: "No HF Inference provider available for this HF model; using Replicate LLaVA-13B via REPLICATE_API_TOKEN.",
  });
}

async function handleTextToPng(request: Request) {
  const body = await readBodyAsObject(request);
  const parsed = textToImageSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.flatten());

  if (hfFixturesEnabled()) {
    return sampleResponse("ttpng");
  }

  const { prompt, negative_prompt, model } = parsed.data;
  const modelId = canonicalizeModelId(model || DEFAULT_IMAGE_MODEL);
  const provider = getBestProvider(modelId, "textToImage");

  const out = await hfTextToImage({
    model: modelId,
    inputs: prompt,
    parameters: { negative_prompt: negative_prompt || "blurry" },
    provider,
  });

  const buffer = Buffer.from(await out.arrayBuffer());
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": imageResponseContentType(out.type),
      "Content-Disposition": "inline; filename=generated-image.png",
    },
  });
}

export async function POST(request: Request) {
  const denied = guardApiRequest(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const parsing = typeSchema.safeParse(typeParam);
  if (!parsing.success) {
    return jsonError(400, "Invalid type parameter");
  }
  const type = parsing.data;

  try {
    const handlers = {
      comp: handleCompletion,
      translation: handleTranslation,
      imgtt: handleImageToText,
      ttpng: handleTextToPng,
    } satisfies Record<HfRouteType, (req: Request) => Promise<Response>>;

    return await handlers[type](request);
  } catch (error: unknown) {
    const fromClient =
      error instanceof HttpError && error.status === 402
        ? {
            kind: "credits" as const,
            status: 402,
            message: HF_CREDITS_MESSAGE,
            fallbackToFixtures: true,
          }
        : error instanceof HttpError
          ? null
          : classifyUpstreamFailure(error);

    if (!(error instanceof HttpError)) {
      logUpstreamFailure(error, fromClient);
    }

    if (
      fromClient?.kind === "credits" &&
      fromClient.fallbackToFixtures &&
      savedFixturesExist()
    ) {
      return sampleResponse(type, fromClient.message);
    }
    if (fromClient) {
      return NextResponse.json(
        { error: fromClient.message },
        { status: fromClient.status }
      );
    }
    if (error instanceof HttpError) {
      return jsonError(error.status, error.message);
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/** Deny non-mutation verbs on this write route (stack proof / security tests). */
export async function GET() {
  return jsonError(405, "Method not allowed");
}
