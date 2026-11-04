"use client";

import { useRef, useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { DemoDataBadge } from "@/components/demo-mode-banner";
import {
  DemoPasswordField,
  TaskInputs,
  TaskTypeField,
} from "@/components/hf-task-fields";
import {
  buildTaskRequest,
  type TaskType,
} from "@/components/hf-task-request";
import {
  demoPresentationFromHeaders,
  demoPresentationFromPayload,
  formatClientError,
} from "@/utils/client-error";
import { DEMO_PASSWORD_MESSAGE } from "@/utils/demo-password";
import { formatResultMessage } from "@/utils/format-result";
import { DEFAULT_CHAT_MODEL, DEFAULT_IMAGE_MODEL } from "@/utils/models";

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

function withApiKey(apiKey: string, init: RequestInit): RequestInit {
  const key = apiKey.trim();
  if (!key) return init;
  const headers = new Headers(init.headers);
  headers.set("x-hf-api-key", key);
  return { ...init, headers };
}

async function readTaskResponse(type: TaskType, response: Response) {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatClientError(response.statusText, errorText));
  }
  if (type === "ttpng") {
    const presentation = demoPresentationFromHeaders(response.headers);
    const dataUrl = await blobToDataUrl(await response.blob());
    return { presentation, result: null as string | null, imageResult: dataUrl };
  }
  const data = (await response.json()) as { message?: unknown };
  return {
    presentation: demoPresentationFromPayload(data),
    result: formatResultMessage(data.message),
    imageResult: null as string | null,
  };
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
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [demoData, setDemoData] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setImageResult(null);
    setDemoData(false);
    setNotice(null);
    setLoading(true);

    const requestInit = buildTaskRequest({
      type,
      message,
      text,
      prompt,
      chatModel,
      imageModel,
      image: imageRef.current,
    });
    if ("error" in requestInit) {
      setError(requestInit.error);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/hf?type=${type}`,
        withApiKey(apiKey, requestInit)
      );
      const applied = await readTaskResponse(type, response);
      setDemoData(applied.presentation.demoData);
      setNotice(applied.presentation.notice);
      setResult(applied.result);
      setImageResult(applied.imageResult);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

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
        <TaskTypeField type={type} onChange={setType} />
        <DemoPasswordField value={apiKey} onChange={setApiKey} />
        <TaskInputs
          type={type}
          chatModel={chatModel}
          imageModel={imageModel}
          message={message}
          text={text}
          prompt={prompt}
          hasImage={hasImage}
          onChatModel={setChatModel}
          onImageModel={setImageModel}
          onMessage={setMessage}
          onText={setText}
          onPrompt={setPrompt}
          onImage={(file) => {
            imageRef.current = file;
            setHasImage(Boolean(file));
          }}
        />
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
      {loading ? (
        <div className="flex justify-center mt-4" role="status" aria-live="polite">
          <ClipLoader size={50} color={"#1e3a8a"} loading={loading} />
          <span className="sr-only">Loading</span>
        </div>
      ) : null}
      {demoData || notice ? (
        <div className="mt-4 flex flex-col items-start gap-2">
          {demoData ? <DemoDataBadge /> : null}
          {notice ? (
            <p className="text-sm text-amber-950" role="status">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 text-red-700" role="alert">
          {error === DEMO_PASSWORD_MESSAGE ? (
            error
          ) : (
            <>
              <strong>Error:</strong> {error}
            </>
          )}
        </div>
      ) : null}
      {result ? (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-900">Result</h2>
          <pre className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-gray-900">
            {result}
          </pre>
        </div>
      ) : null}
      {imageResult ? (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-900">Generated Image</h2>
          <img src={imageResult} alt="Generated from prompt" className="rounded-md" />
        </div>
      ) : null}
    </div>
  );
}
