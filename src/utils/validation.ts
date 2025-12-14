import { z } from "zod";

export const typeSchema = z.enum(["comp", "translation", "imgtt", "ttpng"]);

export const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  model: z.string().optional(),
  max_tokens: z.coerce.number().int().positive().optional(),
});

export const translationSchema = z.object({
  text: z.string().min(1, "Text is required"),
  targetLang: z.string().default("French").optional(),
  model: z.string().optional(),
});

export const textToImageSchema = z.object({
  prompt: z.string().min(3, "Prompt is required"),
  negative_prompt: z.string().optional(),
  model: z.string().optional(),
});
