# Spec

Current behavior of the Hugging Face API demo as built on `dev`. This describes the app, not a future design.

## Product

A single-page demo. The operator picks a task, optionally types a shared API key, and submits. Results stay in the browser. There is no database, no user accounts, and no email/password auth.

## Pages

| Route | Behavior |
| --- | --- |
| `GET /` | Static page that renders the demo form. |
| `POST /api/hf?type=` | One inference task. `type` is `comp`, `translation`, `imgtt`, or `ttpng`. |
| `GET /api/hf` | `405` with `{ "error": "Method not allowed" }`. |

## Tasks

| `type` | Input | Provider | Success body |
| --- | --- | --- | --- |
| `comp` | JSON `message`, optional `model`, optional `max_tokens` | HF `chatCompletion` | `{ "message": string }` |
| `translation` | JSON `text`, optional `targetLang` (default French), optional `model` | HF `chatCompletion` with a translation prompt | `{ "message": string }` |
| `imgtt` | multipart field `image` | Replicate `yorickvp/llava-13b`, polled to a terminal prediction | `{ "message": caption }` |
| `ttpng` | JSON `prompt`, optional `negative_prompt`, optional `model` | HF `textToImage` | image bytes |

Fixture mode (`HF_USE_FIXTURES=true`) returns labeled text or a 1×1 PNG and sets `fixture: true` or `X-HF-Fixture: true`. It does not call Hugging Face or Replicate.

## Models

The UI only offers the catalog in `src/utils/models.ts`. The API rejects any other id with 400. Omitted `model` uses the catalog default for that task.

Chat defaults to `deepseek-ai/DeepSeek-V3-0324` with provider `auto`. Image defaults to `black-forest-labs/FLUX.1-dev` with provider `auto`. Stable Diffusion XL is pinned to `fal-ai`. Other catalog entries use `auto`. Aliases in `canonicalizeModelId` map a few legacy ids onto those catalog ids.

Image captioning does not take a model id. It always uses Replicate LLaVA-13B.

## Access control

`guardApiRequest` runs before a provider call:

1. **Rate limit** — 30 requests per 60 seconds per client address (`x-forwarded-for`, else `x-real-ip`, else `unknown`). Over the limit: `429` and `Retry-After`. The counter is in memory for that server process.
2. **Origin** — if `Origin` is present, its host must match `x-forwarded-host` or `Host`. Otherwise `403`. Requests with no `Origin` are not rejected here.
3. **Shared secret** — if `HF_API_SECRET` is set, the request must send the same value in `x-hf-api-key` or `Authorization: Bearer`. Comparison is a SHA-256 digest checked with `timingSafeEqual`. Missing or wrong key: `401`. If `HF_API_SECRET` is unset and fixtures are on, the request continues. If it is unset and fixtures are off: `503` `Live inference is disabled` and no provider is called.
4. **Body size** — `Content-Length` above 5 MiB: `413`.

The demo form keeps the API key in component state and sends `x-hf-api-key` only when the field is non-empty. The key is not written into the bundle.

## Validation

| Field | Rule |
| --- | --- |
| `message`, `text`, `prompt`, `negative_prompt` | At most 4000 characters. Prompts need at least 3 characters. `message` and `text` need at least 1. |
| `max_tokens` | Integer from 1 through 2048. Default used by the handler when omitted: 1000. |
| `targetLang` | At most 64 characters. Default `French`. |
| `model` | Optional, at most 200 characters, and must be a catalog id for that task. |
| `image` | A `File`, non-empty, at most 4 MiB, MIME `image/jpeg`, `image/png`, `image/webp`, or `image/gif`. |

Invalid JSON or a non-multipart body on a JSON task returns `400` with `Invalid JSON body` or `Invalid form body`.

## Errors

| Status | When |
| --- | --- |
| 400 | Bad `type`, schema failure, bad image, bad body |
| 401 | Shared secret required and missing or wrong |
| 403 | `Origin` host does not match the request host |
| 405 | `GET /api/hf` |
| 413 | `Content-Length` over 5 MiB |
| 429 | Rate limit |
| 503 | Live mode while `HF_API_SECRET` is unset |
| 500 | Any other failure. Body is `{ "error": "An unexpected error occurred" }`. The server logs the underlying error and does not return it. |

## Runtime

- Node.js runtime for the route (`export const runtime = "nodejs"`).
- `HF_TOKEN` is read when `src/utils/hf.ts` loads. The client is created on first use. Import and production build succeed when the variable is unset.
- `REPLICATE_API_TOKEN` is read inside the caption function. The Replicate client is created on first use.
- Text-to-image responses use the blob type when it is an allowed image type, otherwise `image/png`.
- Text-to-image always sends `negative_prompt`, using `blurry` when the client omits it.

## Out of scope

Firebase, Stripe, webhooks, Firestore, first-party accounts, and changing which catalog model ids or providers the app calls.
