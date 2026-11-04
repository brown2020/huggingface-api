export type TaskType = "" | "comp" | "translation" | "imgtt" | "ttpng";

type TaskRequestInput = {
  type: TaskType;
  message: string;
  text: string;
  prompt: string;
  chatModel: string;
  imageModel: string;
  image: File | null;
};

function imageRequest(input: TaskRequestInput): RequestInit | { error: string } {
  if (!input.image) return { error: "Missing image" };
  const formData = new FormData();
  formData.append("image", input.image);
  return { method: "POST", body: formData };
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** Build the same POST the form used to assemble inline. */
export function buildTaskRequest(
  input: TaskRequestInput
): RequestInit | { error: string } {
  if (input.type === "imgtt") return imageRequest(input);
  if (input.type === "comp") {
    return jsonRequest({ message: input.message, model: input.chatModel });
  }
  if (input.type === "translation") {
    return jsonRequest({ text: input.text, model: input.chatModel });
  }
  if (input.type === "ttpng") {
    return jsonRequest({ prompt: input.prompt, model: input.imageModel });
  }
  return { error: "Invalid type or missing required input" };
}
