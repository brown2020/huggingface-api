import "server-only";
import Replicate from "replicate";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export const replicate = new Replicate({ auth: REPLICATE_API_TOKEN || "" });

export type CaptionImageInput = {
  imageUrl: string;
  prompt?: string;
};

// LLaVA-13B alternative (image captioning) https://replicate.com/yorickvp/llava-13b/api
const LLAVA_MODEL_ID = "yorickvp/llava-13b";
const LLAVA_OWNER = LLAVA_MODEL_ID.split("/")[0];
const LLAVA_NAME = LLAVA_MODEL_ID.split("/")[1];
const LLAVA_VERSION = process.env.REPLICATE_LLAVA_13B_VERSION;

let cachedLlava13bVersionId: string | null = null;
let cachedLlava13bVersionIdPromise: Promise<string> | null = null;

async function getLatestLlava13bVersionId(): Promise<string> {
  if (cachedLlava13bVersionId) return cachedLlava13bVersionId;
  if (cachedLlava13bVersionIdPromise) return cachedLlava13bVersionIdPromise;

  cachedLlava13bVersionIdPromise = (async () => {
    const model = await replicate.models.get(LLAVA_OWNER, LLAVA_NAME);
    const latest = (model as unknown as { latest_version?: { id?: string } })
      .latest_version;
    if (!latest?.id) {
      throw new Error(
        `Could not resolve model version for ${LLAVA_OWNER}/${LLAVA_NAME}. Set REPLICATE_LLAVA_13B_VERSION.`
      );
    }
    cachedLlava13bVersionId = latest.id;
    return latest.id;
  })().finally(() => {
    cachedLlava13bVersionIdPromise = null;
  });

  return cachedLlava13bVersionIdPromise;
}

export async function captionWithLlava13bUrl(input: CaptionImageInput) {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }

  const versionId = LLAVA_VERSION || (await getLatestLlava13bVersionId());
  const identifier = `${LLAVA_MODEL_ID}:${versionId}` as const;

  const output = (await replicate.run(identifier, {
    input: {
      image: input.imageUrl,
      prompt: input.prompt ?? "Describe the image",
      question: input.prompt ?? "Describe the image",
    },
    wait: { mode: "block", interval: 1000 },
  })) as unknown;

  return output;
}
