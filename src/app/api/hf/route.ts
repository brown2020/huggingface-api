import { NextResponse } from "next/server";
import { inference } from "@/utils/hf";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (!type) {
    return NextResponse.json(
      { error: "Type parameter is required" },
      { status: 400 }
    );
  }

  const formData = await request.formData();

  try {
    console.log("type", type);

    if (type === "comp") {
      const message = formData.get("message") as string;
      if (!message) {
        throw new Error("Message parameter is required for type 'comp'");
      }
      console.log("message", message);

      const modelId = "deepseek-ai/deepseek-v3-0324";
      const provider = "fireworks-ai";

      const out = await inference.chatCompletion({
        model: modelId,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 1000,
        provider: provider,
      });

      console.log(out.choices[0].message);

      return NextResponse.json(
        { message: out.choices[0].message },
        { status: 200 }
      );
    }

    if (type === "translation") {
      const text = formData.get("text") as string;
      if (!text) {
        throw new Error("Text parameter is required for type 'translation'");
      }

      const modelId = "deepseek-ai/deepseek-v3-0324";
      const provider = "fireworks-ai";

      const out = await inference.chatCompletion({
        model: modelId,
        messages: [
          {
            role: "user",
            content: `Translate the following text to French: "${text}"`,
          },
        ],
        max_tokens: 1000,
        provider: provider,
      });

      console.log("output", out.choices[0].message);
      return NextResponse.json(
        { message: out.choices[0].message.content },
        { status: 200 }
      );
    }

    if (type === "imgtt") {
      const imageBlob = formData.get("image") as Blob;
      if (!imageBlob) {
        throw new Error("No image provided");
      }

      return NextResponse.json(
        {
          message:
            "Image analysis functionality is currently unavailable. We're working on a fix.",
        },
        { status: 200 }
      );
    }

    if (type === "ttpng") {
      const prompt = formData.get("prompt") as string;
      if (!prompt) {
        throw new Error("Prompt parameter is required for type 'ttpng'");
      }

      const modelId = "stabilityai/stable-diffusion-xl-base-1.0";
      const provider = "replicate";

      const out = await inference.textToImage({
        model: modelId,
        inputs: prompt,
        parameters: {
          negative_prompt: "blurry",
        },
        provider: provider,
      });

      console.log("output", out);
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
