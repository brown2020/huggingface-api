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
      const imageFile = formData.get("image") as File | null;
      if (!imageFile) {
        return NextResponse.json(
          { error: "Image is required" },
          { status: 400 }
        );
      }
      // Convert file to data URL; Replicate run accepts URL strings for media
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:${imageFile.type};base64,${base64}`;
      // Use Replicate LLaVA-13B as an alternate provider for HF model compatibility
      const output = await captionWithLlava13bUrl({ imageUrl: dataUrl });
      return NextResponse.json(
        {
          message: output,
          note: "No HF Inference provider available for this HF model; using Replicate LLaVA-13B via REPLICATE_API_TOKEN.",
        },
        { status: 200 }
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
