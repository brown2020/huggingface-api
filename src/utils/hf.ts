import { HfInference } from "@huggingface/inference";

const HF_TOKEN = process.env.HF_TOKEN;

// Create the main inference client with Hugging Face token
export const inference = new HfInference(HF_TOKEN);

// Helper function to determine the best provider for a given model and task
export const getBestProvider = (modelId: string, task: string): string => {
  // Using a mapping optimized for Fireworks.ai and Replicate
  const providerMap: Record<string, string> = {
    // Fireworks.ai - best for large LLMs and select image models
    // LLMs
    "mistralai/Mistral-7B-Instruct-v0.2": "fireworks-ai",
    "llama-3-70b-instruct": "fireworks-ai",
    "meta-llama/Llama-3.2-90B-Vision-Instruct": "fireworks-ai", // Vision model
    "meta-llama/Llama-3.1-405B-Instruct": "fireworks-ai",
    "meta-llama/Llama-3-8B-Instruct": "fireworks-ai",
    "meta-llama/Llama-2-70b-chat": "fireworks-ai",
    "deepseek-ai/DeepSeek-R1": "fireworks-ai",
    "deepseek-ai/deepseek-v3-0324": "fireworks-ai",
    "microsoft/phi-3-vision-128k-instruct": "fireworks-ai", // Added the Phi-3 Vision model
    "mistralai/Mistral-Small-24B-Instruct-2501": "fireworks-ai",
    "Qwen/Qwen2.5-Coder-32B-Instruct": "fireworks-ai",

    // Image generation - Fireworks excels at SD 3.5 and FLUX models
    "stabilityai/stable-diffusion-3.5": "fireworks-ai",
    "black-forest-labs/FLUX.1-dev": "fireworks-ai",

    // Replicate - excellent for many specialized and creative models
    // Image generation - Replicate excels with various SD models and specialized image generators
    "stability-ai/sdxl": "replicate",
    "stability-ai/stable-diffusion": "replicate",
    "prompthero/openjourney": "replicate",
    "cjwbw/anything-v3-better-vae": "replicate",
    "cjwbw/anything-v4.0": "replicate",
    "cjwbw/portraitplus": "replicate",
    "stability-ai/stable-diffusion-xl-base-1.0": "replicate",
    "runwayml/stable-diffusion-v1-5": "replicate",
    "timbrooks/instruct-pix2pix": "replicate", // Image editing

    // Specialized LLMs & applications
    "anthropic/claude-3-opus-20240229": "replicate",
    "meta/llama-2-13b-chat": "replicate",
    "meta/llama-2-7b-chat": "replicate",
    "mistralai/mixtral-8x7b-instruct-v0.1": "replicate",
    "01-ai/yi-34b-chat": "replicate",

    // Multimodal
    "yorickvp/llava-13b": "replicate",

    // Text-to-speech
    "suno/bark": "replicate",

    // Translation models
    "t5-base": "replicate",

    // Image-to-text models
    "nlpconnect/vit-gpt2-image-captioning": "replicate",
  };

  // Choose provider based on the task if no specific model mapping exists
  if (!providerMap[modelId]) {
    if (task === "textToImage" || task === "imageToImage") {
      return "replicate"; // Replicate has more diverse image model options
    } else if (task === "chatCompletion" || task === "textGeneration") {
      return "fireworks-ai"; // Fireworks has optimized LLM infrastructure
    }
  }

  // Default between the two providers based on model ID pattern matching
  return (
    providerMap[modelId] ||
    (modelId.includes("stable-diffusion") ? "replicate" : "fireworks-ai")
  );
};
