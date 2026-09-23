import "server-only";
import {
  HfInference,
  type InferenceProviderOrPolicy,
} from "@huggingface/inference";
import {
  canonicalizeModelId,
  getCatalogEntry,
} from "@/utils/models";

const HF_TOKEN = process.env.HF_TOKEN;

function getInference(): HfInference {
  if (!HF_TOKEN) {
    throw new Error("HF_TOKEN is not set");
  }
  return new HfInference(HF_TOKEN);
}

// Create the main inference client with Hugging Face token (lazy to avoid build-time crash)
export const inference = new Proxy({} as HfInference, {
  get(_, prop) {
    const instance = getInference();
    const value = instance[prop as keyof HfInference];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

/**
 * Explicit overrides for models not in the UI catalog (legacy / specialized).
 * Prefer live Inference Providers; avoid stale Fireworks-only maps for models
 * that HF no longer routes there (e.g. DeepSeek-V3-0324).
 */
const PROVIDER_OVERRIDES: Record<string, InferenceProviderOrPolicy> = {
  // Chat — live as of 2026-09 Hub inferenceProviderMapping
  "deepseek-ai/DeepSeek-V3-0324": "auto",
  "deepseek-ai/DeepSeek-R1": "novita",
  "deepseek-ai/DeepSeek-V3": "deepinfra",
  "meta-llama/Llama-3.1-8B-Instruct": "auto",
  "meta-llama/Llama-3.2-90B-Vision-Instruct": "auto",
  "meta-llama/Llama-3.1-405B-Instruct": "auto",
  "meta-llama/Llama-3-8B-Instruct": "auto",
  "openai/gpt-oss-120b": "auto",
  "Qwen/Qwen2.5-Coder-32B-Instruct": "auto",
  "Qwen/Qwen2.5-7B-Instruct": "featherless-ai",
  "mistralai/Mistral-Small-24B-Instruct-2501": "auto",

  // Image generation
  "black-forest-labs/FLUX.1-dev": "auto",
  "black-forest-labs/FLUX.1-schnell": "auto",
  "stabilityai/stable-diffusion-xl-base-1.0": "fal-ai",
  "stabilityai/stable-diffusion-3.5-large": "auto",
  "stabilityai/stable-diffusion-3.5": "auto",

  // Image captioning (HF Inference when available)
  "Salesforce/blip-image-captioning-base": "hf-inference",
  "Salesforce/blip-image-captioning-large": "hf-inference",
  "microsoft/git-large-coco": "hf-inference",
  "nlpconnect/vit-gpt2-image-captioning": "hf-inference",

  // Replicate-oriented specialty (still valid when user has provider key)
  "yorickvp/llava-13b": "replicate",
  "suno/bark": "replicate",
  "timbrooks/instruct-pix2pix": "replicate",
};

function isProviderPolicy(value: string): value is InferenceProviderOrPolicy {
  const known = new Set([
    "baseten",
    "black-forest-labs",
    "cerebras",
    "clarifai",
    "cohere",
    "deepinfra",
    "fal-ai",
    "featherless-ai",
    "fireworks-ai",
    "groq",
    "hf-inference",
    "hyperbolic",
    "nebius",
    "novita",
    "nscale",
    "nvidia",
    "openai",
    "ovhcloud",
    "publicai",
    "replicate",
    "sambanova",
    "scaleway",
    "together",
    "wavespeed",
    "zai-org",
    "auto",
  ]);
  return known.has(value);
}

/**
 * Resolve the best Inference Provider (or "auto") for a model + task.
 * Catalog entries and explicit overrides win; otherwise task-based defaults
 * use "auto" so HF picks a live provider instead of a stale hardcoded one.
 */
export const getBestProvider = (
  modelId: string,
  task: string
): InferenceProviderOrPolicy => {
  const id = canonicalizeModelId(modelId);

  const catalog = getCatalogEntry(id);
  if (catalog && isProviderPolicy(catalog.provider)) {
    return catalog.provider;
  }

  if (PROVIDER_OVERRIDES[id]) {
    return PROVIDER_OVERRIDES[id];
  }

  if (task === "textToImage" || task === "imageToImage") {
    if (id.includes("stable-diffusion") || id.includes("sdxl")) {
      return "fal-ai";
    }
    return "auto";
  }
  if (task === "imageToText") {
    return "hf-inference";
  }
  // chatCompletion / textGeneration / unknown
  return "auto";
};

export { canonicalizeModelId };
