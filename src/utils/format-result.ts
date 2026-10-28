/** Show string model output as text. Stringify structured output without quoting strings twice. */
export function formatResultMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (message == null) return "";
  try {
    return JSON.stringify(message, null, 2) ?? "";
  } catch {
    return "";
  }
}
