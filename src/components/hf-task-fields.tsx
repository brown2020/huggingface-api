import {
  CHAT_MODELS,
  IMAGE_MODELS,
} from "@/utils/models";
import { DEMO_PASSWORD_MESSAGE } from "@/utils/demo-password";
import type { TaskType } from "@/components/hf-task-request";

const fieldClass =
  "mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white";
const labelClass = "block text-sm font-medium text-gray-800";

export function TaskTypeField({
  type,
  onChange,
}: {
  type: TaskType;
  onChange: (type: TaskType) => void;
}) {
  return (
    <div>
      <label htmlFor="hf-task-type" className={labelClass}>
        Type
      </label>
      <select
        id="hf-task-type"
        value={type}
        onChange={(e) => onChange(e.target.value as TaskType)}
        className={fieldClass}
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
  );
}

export function DemoPasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor="hf-demo-password" className={labelClass}>
        Demo password
      </label>
      <input
        id="hf-demo-password"
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        aria-describedby="hf-demo-password-help"
        className={fieldClass}
        placeholder="Demo password"
      />
      <p id="hf-demo-password-help" className="mt-1 text-sm text-gray-700">
        {DEMO_PASSWORD_MESSAGE}. This is the shared HF_API_SECRET, not a
        Hugging Face token.
      </p>
    </div>
  );
}

function ModelSelect({
  id,
  value,
  onChange,
  models,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  models: { id: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Model
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
        required
        aria-required="true"
      />
    </div>
  );
}

export function TaskInputs({
  type,
  chatModel,
  imageModel,
  message,
  text,
  prompt,
  hasImage,
  onChatModel,
  onImageModel,
  onMessage,
  onText,
  onPrompt,
  onImage,
}: {
  type: TaskType;
  chatModel: string;
  imageModel: string;
  message: string;
  text: string;
  prompt: string;
  hasImage: boolean;
  onChatModel: (value: string) => void;
  onImageModel: (value: string) => void;
  onMessage: (value: string) => void;
  onText: (value: string) => void;
  onPrompt: (value: string) => void;
  onImage: (file: File | null) => void;
}) {
  const showChatModel = type === "comp" || type === "translation";
  return (
    <>
      {showChatModel ? (
        <ModelSelect
          id="hf-chat-model"
          value={chatModel}
          onChange={onChatModel}
          models={CHAT_MODELS}
        />
      ) : null}
      {type === "ttpng" ? (
        <ModelSelect
          id="hf-image-model"
          value={imageModel}
          onChange={onImageModel}
          models={IMAGE_MODELS}
        />
      ) : null}
      {type === "comp" ? (
        <TextInput
          id="hf-message"
          label="Message"
          value={message}
          onChange={onMessage}
        />
      ) : null}
      {type === "translation" ? (
        <TextInput id="hf-text" label="Text" value={text} onChange={onText} />
      ) : null}
      {type === "imgtt" ? (
        <div>
          <label htmlFor="hf-image" className={labelClass}>
            Image
          </label>
          <input
            id="hf-image"
            type="file"
            accept="image/*"
            onChange={(e) => onImage(e.target.files?.[0] ?? null)}
            className={fieldClass}
            required={!hasImage}
            aria-required="true"
          />
        </div>
      ) : null}
      {type === "ttpng" ? (
        <TextInput
          id="hf-prompt"
          label="Prompt"
          value={prompt}
          onChange={onPrompt}
        />
      ) : null}
    </>
  );
}
