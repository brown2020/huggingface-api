"use client";

import { useRef, useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  IMAGE_MODELS,
} from "@/utils/models";

type TaskType = "" | "comp" | "translation" | "imgtt" | "ttpng";

/** Convert a blob to a data URL without createObjectURL (React Doctor-safe). */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image blob"));
    reader.readAsDataURL(blob);
  });
}

/** Parse API error bodies so the toast shows the HF message, not raw JSON. */
function formatClientError(statusText: string, bodyText: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) return statusText || "Request failed";
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: unknown;
      message?: unknown;
    };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    if (
      parsed.error &&
      typeof parsed.error === "object" &&
      "message" in (parsed.error as object) &&
      typeof (parsed.error as { message: unknown }).message === "string"
    ) {
      return (parsed.error as { message: string }).message;
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    /* plain text */
  }
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
}

export default function HuggingFace() {
  const [type, setType] = useState<TaskType>("");
  const [message, setMessage] = useState("");
  const [text, setText] = useState("");
  const imageRef = useRef<File | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [chatModel, setChatModel] = useState(DEFAULT_CHAT_MODEL);
  const [imageModel, setImageModel] = useState(DEFAULT_IMAGE_MODEL);
  const [result, setResult] = useState<string | null>(null);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setImageResult(null);
    setLoading(true);

    let requestInit: RequestInit | null = null;
    if (type === "imgtt") {
      const image = imageRef.current;
      if (!image) {
        setError("Missing image");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", image);
      requestInit = { method: "POST", body: formData };
    } else if (type === "comp") {
      requestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, model: chatModel }),
      };
    } else if (type === "translation") {
      requestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model: chatModel }),
      };
    } else if (type === "ttpng") {
      requestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: imageModel }),
      };
    } else {
      setError("Invalid type or missing required input");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/hf?type=${type}`, requestInit);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(formatClientError(response.statusText, errorText));
      }

      if (type === "ttpng") {
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        setImageResult(dataUrl);
      } else {
        const data = await response.json();
        setResult(JSON.stringify(data.message, null, 2));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const showChatModel = type === "comp" || type === "translation";
  const showImageModel = type === "ttpng";

  return (
    <div className="flex flex-col p-4 w-full">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">
        HuggingFace API Interface
      </h1>
      <p className="mb-4 text-sm text-gray-700">
        Demo for chat completion, translation, image captioning, and text-to-image
        via Hugging Face Inference Providers (and Replicate for LLaVA captioning).
        Model list is limited to Hub models with live provider mappings. Prefer
        fixtures in CI — see AGENTS.md.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
        <div>
          <label
            htmlFor="hf-task-type"
            className="block text-sm font-medium text-gray-800"
          >
            Type
          </label>
          <select
            id="hf-task-type"
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
            required
            aria-required="true"
          >
            <option value="">Select type</option>
            <option value="comp">Completion</option>
            <option value="translation">Translation</option>
            <option value="imgtt">Image to Text</option>
            <option value="ttpng">Text to PNG</option>
          </select>
        </div>
        {showChatModel && (
          <div>
            <label
              htmlFor="hf-chat-model"
              className="block text-sm font-medium text-gray-800"
            >
              Model
            </label>
            <select
              id="hf-chat-model"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
            >
              {CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {showImageModel && (
          <div>
            <label
              htmlFor="hf-image-model"
              className="block text-sm font-medium text-gray-800"
            >
              Model
            </label>
            <select
              id="hf-image-model"
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
            >
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {type === "comp" && (
          <div>
            <label
              htmlFor="hf-message"
              className="block text-sm font-medium text-gray-800"
            >
              Message
            </label>
            <input
              id="hf-message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              required
              aria-required="true"
            />
          </div>
        )}
        {type === "translation" && (
          <div>
            <label
              htmlFor="hf-text"
              className="block text-sm font-medium text-gray-800"
            >
              Text
            </label>
            <input
              id="hf-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              required
              aria-required="true"
            />
          </div>
        )}
        {type === "imgtt" && (
          <div>
            <label
              htmlFor="hf-image"
              className="block text-sm font-medium text-gray-800"
            >
              Image
            </label>
            <input
              id="hf-image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                imageRef.current = file;
                setHasImage(Boolean(file));
              }}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              required={!hasImage}
              aria-required="true"
            />
          </div>
        )}
        {type === "ttpng" && (
          <div>
            <label
              htmlFor="hf-prompt"
              className="block text-sm font-medium text-gray-800"
            >
              Prompt
            </label>
            <input
              id="hf-prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              required
              aria-required="true"
            />
          </div>
        )}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-xs text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </form>
      {loading && (
        <div
          className="flex justify-center mt-4"
          role="status"
          aria-live="polite"
        >
          <ClipLoader size={50} color={"#1e3a8a"} loading={loading} />
          <span className="sr-only">Loading</span>
        </div>
      )}
      {error && (
        <div className="mt-4 text-red-700" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-900">Result</h2>
          <pre className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-gray-900">
            {result}
          </pre>
        </div>
      )}
      {imageResult && (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-900">Generated Image</h2>
          <img src={imageResult} alt="Generated from prompt" className="rounded-md" />
        </div>
      )}
    </div>
  );
}
