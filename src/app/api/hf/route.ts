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

      const out = await inference.chatCompletion({
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 1000,
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

      const out = await inference.translation({
        model: "t5-base",
        inputs: text,
      });

      console.log("output", out);
      return NextResponse.json({ message: out }, { status: 200 });
    }

    if (type === "imgtt") {
      const imageBlob = formData.get("image") as Blob;
      if (!imageBlob) {
        throw new Error("No image provided");
      }
      const out = await inference.imageToText({
        model: "nlpconnect/vit-gpt2-image-captioning",
        data: imageBlob,
      });

      console.log("output", out);
      return NextResponse.json({ message: out }, { status: 200 });
    }

    if (type === "ttpng") {
      const prompt = formData.get("prompt") as string;
      if (!prompt) {
        throw new Error("Prompt parameter is required for type 'ttpng'");
      }

      const out = await inference.textToImage({
        model: "stabilityai/stable-diffusion-xl-base-1.0",
        inputs: prompt,
        parameters: {
          negative_prompt: "blurry",
        },
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
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
