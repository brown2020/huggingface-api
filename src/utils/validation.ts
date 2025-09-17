import { z } from "zod";

export const typeSchema = z.enum(["comp", "translation", "imgtt", "ttpng"]);

export const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  model: z.string().optional(),
  max_tokens: z.coerce.number().int().positive().optional(),
});

export const translationSchema = z.object({
  text: z.string().min(1, "Text is required"),
  targetLang: z.string().default("fr").optional(),
  model: z.string().optional(),
});

export const imageToTextSchema = z.object({
  // Validated separately since FormData holds Blob
  model: z.string().optional(),
});

export const textToImageSchema = z.object({
  prompt: z.string().min(3, "Prompt is required"),
  negative_prompt: z.string().optional(),
  model: z.string().optional(),
});

export type ChatPayload = z.infer<typeof chatSchema>;
export type TranslationPayload = z.infer<typeof translationSchema>;
export type ImageToTextPayload = z.infer<typeof imageToTextSchema>;
export type TextToImagePayload = z.infer<typeof textToImageSchema>;
