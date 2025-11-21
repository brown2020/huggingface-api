import Replicate from "replicate";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export const replicate = new Replicate({ auth: REPLICATE_API_TOKEN || "" });

export type VideoLlavaUrlInput = {
  imageUrl: string;
  prompt?: string;
};

// Model: https://replicate.com/n1jl0091/video-llava-7b-hf_replicate_n1jl0091/api
const MODEL_ID = "n1jl0091/video-llava-7b-hf_replicate_n1jl0091";
const MODEL_OWNER = MODEL_ID.split("/")[0];
const MODEL_NAME = MODEL_ID.split("/")[1];
const VIDEO_LLAVA_VERSION = process.env.REPLICATE_VIDEO_LLAVA_VERSION;

async function getLatestModelVersionId(): Promise<string> {
  const model = await replicate.models.get(MODEL_OWNER, MODEL_NAME);
  const latest = (model as unknown as { latest_version?: { id?: string } })
    .latest_version;
  if (!latest?.id) {
    throw new Error(
      "Could not resolve Replicate model version. Set REPLICATE_VIDEO_LLAVA_VERSION."
    );
  }
  return latest.id;
}

export async function captionWithVideoLlavaUrl(input: VideoLlavaUrlInput) {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }

  const versionId = VIDEO_LLAVA_VERSION || (await getLatestModelVersionId());
  const identifier = `${MODEL_ID}:${versionId}` as const;

  const output = (await replicate.run(identifier, {
    input: {
      videos: [input.imageUrl],
      prompts: [input.prompt ?? "Describe the content"],
    },
    wait: { mode: "block", interval: 1000 },
  })) as unknown;

  return output;
}

// LLaVA-13B alternative (image captioning) https://replicate.com/yorickvp/llava-13b/api
const LLAVA_MODEL_ID = "yorickvp/llava-13b";
const LLAVA_OWNER = LLAVA_MODEL_ID.split("/")[0];
const LLAVA_NAME = LLAVA_MODEL_ID.split("/")[1];
const LLAVA_VERSION = process.env.REPLICATE_LLAVA_13B_VERSION;

async function getLatestVersionId(
  owner: string,
  name: string
): Promise<string> {
  const model = await replicate.models.get(owner, name);
  const latest = (model as unknown as { latest_version?: { id?: string } })
    .latest_version;
  if (!latest?.id) {
    throw new Error(
      `Could not resolve model version for ${owner}/${name}. Set version env.`
    );
  }
  return latest.id;
}

export async function captionWithLlava13bUrl(input: VideoLlavaUrlInput) {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }

  const versionId =
    LLAVA_VERSION || (await getLatestVersionId(LLAVA_OWNER, LLAVA_NAME));
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
