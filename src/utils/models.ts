/**
 * Provider-backed model catalog for Hugging Face Inference Providers.
 * Only list Hub model ids that currently expose inferenceProviderMapping
 * (see https://huggingface.co/inference/models). Prefer provider "auto"
 * so HF routes to a live backend; explicit providers are pinned when useful.
 */

export type HfTask =
  | "chatCompletion"
  | "textToImage"
  | "imageToText"
  | "textGeneration";

export type CatalogModel = {
  id: string;
  label: string;
  task: HfTask;
  /** Preferred provider or "auto". */
  provider: string;
};

/** Canonical chat / translation defaults. */
export const DEFAULT_CHAT_MODEL = "deepseek-ai/DeepSeek-V3-0324";

/** Canonical text-to-image default. */
export const DEFAULT_IMAGE_MODEL = "black-forest-labs/FLUX.1-dev";

/**
 * Normalize common aliases (wrong casing / legacy ids) to catalog ids.
 */
const MODEL_ALIASES: Record<string, string> = {
  "deepseek-ai/deepseek-v3-0324": DEFAULT_CHAT_MODEL,
  "deepseek-ai/DeepSeek-V3-0324": DEFAULT_CHAT_MODEL,
  "deepseek-ai/deepseek-r1": "deepseek-ai/DeepSeek-R1",
  "deepseek-ai/DeepSeek-R1": "deepseek-ai/DeepSeek-R1",
  "stabilityai/stable-diffusion-xl-base-1.0":
    "stabilityai/stable-diffusion-xl-base-1.0",
  "stability-ai/stable-diffusion-xl-base-1.0":
    "stabilityai/stable-diffusion-xl-base-1.0",
};

export const CHAT_MODELS: CatalogModel[] = [
  {
    id: DEFAULT_CHAT_MODEL,
    label: "DeepSeek V3 (0324)",
    task: "chatCompletion",
    provider: "auto",
  },
  {
    id: "deepseek-ai/DeepSeek-R1",
    label: "DeepSeek R1",
    task: "chatCompletion",
    provider: "auto",
  },
  {
    id: "meta-llama/Llama-3.1-8B-Instruct",
    label: "Llama 3.1 8B Instruct",
    task: "chatCompletion",
    provider: "auto",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    task: "chatCompletion",
    provider: "auto",
  },
  {
    id: "Qwen/Qwen2.5-Coder-32B-Instruct",
    label: "Qwen2.5 Coder 32B",
    task: "chatCompletion",
    provider: "auto",
  },
];

export const IMAGE_MODELS: CatalogModel[] = [
  {
    id: DEFAULT_IMAGE_MODEL,
    label: "FLUX.1 Dev",
    task: "textToImage",
    provider: "auto",
  },
  {
    id: "black-forest-labs/FLUX.1-schnell",
    label: "FLUX.1 Schnell",
    task: "textToImage",
    provider: "auto",
  },
  {
    id: "stabilityai/stable-diffusion-xl-base-1.0",
    label: "Stable Diffusion XL",
    task: "textToImage",
    provider: "fal-ai",
  },
  {
    id: "stabilityai/stable-diffusion-3.5-large",
    label: "Stable Diffusion 3.5 Large",
    task: "textToImage",
    provider: "auto",
  },
];

const BY_ID = new Map<string, CatalogModel>(
  [...CHAT_MODELS, ...IMAGE_MODELS].map((m) => [m.id, m])
);

export function canonicalizeModelId(modelId: string): string {
  return MODEL_ALIASES[modelId] ?? modelId;
}

export function getCatalogEntry(modelId: string): CatalogModel | undefined {
  const id = canonicalizeModelId(modelId);
  return BY_ID.get(id);
}
