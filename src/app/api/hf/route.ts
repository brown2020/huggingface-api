import { NextResponse } from "next/server";
import { inference, getBestProvider } from "@/utils/hf";
import {
  chatSchema,
  imageToTextSchema,
  textToImageSchema,
  translationSchema,
  typeSchema,
} from "@/utils/validation";

type CaptionItem = { generated_text: string };
const isCaptionItem = (val: unknown): val is CaptionItem =>
  typeof val === "object" &&
  val !== null &&
  "generated_text" in val &&
  typeof (val as { generated_text?: unknown }).generated_text === "string";
const isCaptionArray = (val: unknown): val is CaptionItem[] =>
  Array.isArray(val) && val.every(isCaptionItem);

export async function POST(request: Request) {
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const parsing = typeSchema.safeParse(typeParam);
  if (!parsing.success) {
    return NextResponse.json(
      { error: "Invalid type parameter" },
      { status: 400 }
    );
  }
  const type = parsing.data;

  const formData = await request.formData();

  try {
    console.log("type", type);

    if (type === "comp") {
      const parsed = chatSchema.safeParse({
        message: formData.get("message"),
        model: formData.get("model") || undefined,
        max_tokens: formData.get("max_tokens") || undefined,
      });
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const { message, max_tokens, model } = parsed.data;
      const modelId = model || "deepseek-ai/deepseek-v3-0324";
      const provider = "fireworks-ai";

      const out = await inference.chatCompletion({
        model: modelId,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: max_tokens || 1000,
        provider: provider,
      });

      return NextResponse.json(
        { message: out.choices[0].message },
        { status: 200 }
      );
    }

    if (type === "translation") {
      const parsed = translationSchema.safeParse({
        text: formData.get("text"),
        targetLang: formData.get("targetLang") || undefined,
        model: formData.get("model") || undefined,
      });
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const { text, targetLang, model } = parsed.data;
      const modelId = model || "deepseek-ai/deepseek-v3-0324";
      const provider = "fireworks-ai";

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
        provider: provider,
      });

      return NextResponse.json(
        { message: out.choices[0].message.content },
        { status: 200 }
      );
    }

    if (type === "imgtt") {
      return NextResponse.json(
        {
          error:
            "Image-to-text is disabled because no supported inference provider is configured.",
        },
        { status: 501 }
      );
    }

    if (type === "ttpng") {
      const parsed = textToImageSchema.safeParse({
        prompt: formData.get("prompt"),
        negative_prompt: formData.get("negative_prompt") || undefined,
        model: formData.get("model") || undefined,
      });
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const { prompt, negative_prompt, model } = parsed.data;

      const modelId = model || "stabilityai/stable-diffusion-xl-base-1.0";
      const provider = getBestProvider(modelId, "textToImage");

      const out = await inference.textToImage(
        {
          model: modelId,
          inputs: prompt,
          parameters: {
            negative_prompt: negative_prompt || "blurry",
          },
          provider: provider,
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

    throw new Error("Unsupported type parameter");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error);
      return NextResponse.json(
        { error: error.message || "Unknown error" },
        { status: 500 }
      );
    } else {
      console.error("Unexpected error:", error);
      return NextResponse.json(
        { error: "An unexpected error occurred" },
        { status: 500 }
      );
    }
  }
}
