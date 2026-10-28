import { z } from "zod";
import { getCatalogEntry, type HfTask } from "@/utils/models";

export const MAX_TEXT_CHARS = 4000;
export const MAX_COMPLETION_TOKENS = 2048;

export const typeSchema = z.enum(["comp", "translation", "imgtt", "ttpng"]);

function allowedModel(task: HfTask) {
  return z
    .string()
    .max(200)
    .optional()
    .superRefine((modelId, ctx) => {
      if (modelId === undefined) return;
      const entry = getCatalogEntry(modelId);
      if (!entry || entry.task !== task) {
        ctx.addIssue({ code: "custom", message: "Model is not allowed" });
      }
    });
}

export const chatSchema = z.object({
  message: z.string().min(1, "Message is required").max(MAX_TEXT_CHARS),
  model: allowedModel("chatCompletion"),
  max_tokens: z.coerce.number().int().positive().max(MAX_COMPLETION_TOKENS).optional(),
});

export const translationSchema = z.object({
  text: z.string().min(1, "Text is required").max(MAX_TEXT_CHARS),
  targetLang: z.string().max(64).default("French"),
  model: allowedModel("chatCompletion"),
});

export const textToImageSchema = z.object({
  prompt: z.string().min(3, "Prompt is required").max(MAX_TEXT_CHARS),
  negative_prompt: z.string().max(MAX_TEXT_CHARS).optional(),
  model: allowedModel("textToImage"),
});
