import { NextResponse } from "next/server";
import { inference, getBestProvider } from "@/utils/hf";
import { captionWithLlava13bUrl } from "@/utils/replicate";
import {
  chatSchema,
  textToImageSchema,
  translationSchema,
  typeSchema,
} from "@/utils/validation";

// Removed local image-to-text type guards as imgtt uses Replicate now

export const runtime = "nodejs";

type HfRouteType = "comp" | "translation" | "imgtt" | "ttpng";

type ApiErrorPayload = { error: unknown };

function jsonError(status: number, error: unknown) {
  return NextResponse.json<ApiErrorPayload>({ error }, { status });
}

function getContentType(request: Request) {
  return request.headers.get("content-type") ?? "";
}

async function readBodyAsObject(request: Request) {
  const contentType = getContentType(request);
  if (contentType.includes("application/json")) {
    return (await request.json()) as unknown;
  }
  // Backwards compatibility for older clients using multipart for all requests.
  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

async function handleCompletion(request: Request) {
  const body = await readBodyAsObject(request);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.flatten());

  const { message, max_tokens, model } = parsed.data;
  const modelId = model || "deepseek-ai/deepseek-v3-0324";
  const provider = getBestProvider(modelId, "chatCompletion");

  const out = await inference.chatCompletion({
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

  const { text, targetLang, model } = parsed.data;
  const modelId = model || "deepseek-ai/deepseek-v3-0324";
  const provider = getBestProvider(modelId, "chatCompletion");

  const out = await inference.chatCompletion({
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
  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;
  if (!imageFile) return jsonError(400, "Image is required");

  const arrayBuffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${imageFile.type};base64,${base64}`;

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

  const { prompt, negative_prompt, model } = parsed.data;
  const modelId = model || "stabilityai/stable-diffusion-xl-base-1.0";
  const provider = getBestProvider(modelId, "textToImage");

  const out = await inference.textToImage(
    {
      model: modelId,
      inputs: prompt,
      parameters: { negative_prompt: negative_prompt || "blurry" },
      provider,
    },
    { outputType: "blob" }
  );

  const buffer = Buffer.from(await out.arrayBuffer());
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": "inline; filename=generated-image.png",
    },
  });
}

export async function POST(request: Request) {
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
    if (error instanceof Error) {
      console.error(error);
      return jsonError(500, error.message || "Unknown error");
    } else {
      console.error("Unexpected error:", error);
      return jsonError(500, "An unexpected error occurred");
    }
  }
}
