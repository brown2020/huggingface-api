/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";

export default function HuggingFace() {
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
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

    const formData = new FormData();
    if (type === "comp") {
      formData.append("message", message);
    } else if (type === "translation") {
      formData.append("text", text);
    } else if (type === "imgtt" && image) {
      formData.append("image", image);
    } else if (type === "ttpng") {
      formData.append("prompt", prompt);
    } else {
      setError("Invalid type or missing required input");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/hf?type=${type}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.statusText} - ${errorText}`);
      }

      if (type === "ttpng") {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setImageResult(imageUrl);
      } else {
        const data = await response.json();
        setResult(JSON.stringify(data.message, null, 2));
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error:", error);
        setError(error.message);
      } else {
        console.error("Unexpected error:", error);
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col p-4 w-full">
      <h1 className="text-2xl font-bold mb-4">HuggingFace API Interface</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">Select type</option>
            <option value="comp">Completion</option>
            <option value="translation">Translation</option>
            {/* Image-to-Text temporarily disabled due to provider limitations */}
            <option value="ttpng">Text to PNG</option>
          </select>
        </div>
        {type === "comp" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        )}
        {type === "translation" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        )}
        {/* Image upload field removed while imgtt is disabled */}
        {(type === "ttimg" || type === "ttpng") && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prompt
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        )}
        <div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-xs text-white bg-blue-600 hover:bg-blue-700"
          >
            Submit
          </button>
        </div>
      </form>
      {loading && (
        <div className="flex justify-center mt-4">
          <ClipLoader size={50} color={"#123abc"} loading={loading} />
        </div>
      )}
      {error && (
        <div className="mt-4 text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Result</h2>
          <pre className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
      {imageResult && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Generated Image</h2>
          <img src={imageResult} alt="Generated" className="rounded-md" />
        </div>
      )}
    </div>
  );
}
