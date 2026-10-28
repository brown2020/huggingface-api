# Hugging Face API Demo

Next.js App Router demo for Hugging Face Inference Providers (chat completion, translation, text-to-image) and Replicate LLaVA image captioning. The browser never receives provider tokens. Live calls are off unless a server-only shared secret is configured.

## Features

- **Completion** — chat via `@huggingface/inference`, catalog models only
- **Translation** — same chat path; `targetLang` defaults to French
- **Image to text** — Replicate LLaVA-13B captioning (polled until the prediction finishes)
- **Text to image** — HF `textToImage`; response media type follows the image blob when it is PNG, JPEG, WebP, or GIF
- **Fixtures** — `HF_USE_FIXTURES=true` returns labeled responses and does not call paid providers
- **Request gate** — optional `HF_API_SECRET`, per-address rate limit, `Origin` check when that header is present, body and image limits

Model ids and providers are listed in [`PROVIDER_SETUP.md`](./PROVIDER_SETUP.md). Behavior is specified in [`spec.md`](./spec.md). Follow-ups are in [`roadmap.md`](./roadmap.md).

## Tech stack

Locked versions in `package-lock.json`:

| Layer | Package |
| --- | --- |
| Framework | Next.js 16.4.3 (App Router) |
| UI | React 19.3.1, React DOM 19.3.1, Tailwind CSS 4.3.3, react-spinners 0.17.1 |
| Language | TypeScript 7.0.2 (`tsc` via `@typescript/native`); TypeScript 6.0.3 stays installed as `typescript` so ESLint can load the compiler API |
| Lint | ESLint 10.13.0, `@typescript-eslint` 8.72.1, `@next/eslint-plugin-next` 16.4.3 |
| HF | `@huggingface/inference` 4.13.32 |
| Replicate | `replicate` 1.4.0 |
| Validation | Zod 4.6.7 |
| Tests | Vitest 5.0.5, Vite 8.3.5 |

Requires Node.js `>= 20.9.0`. CI uses Node 22.

## Project structure

```
src/
  app/page.tsx              # Home page
  app/api/hf/route.ts       # POST /api/hf
  components/HuggingFace.tsx
  utils/                    # providers, catalog, validation, fixtures, request gate
.github/workflows/ci.yml
.env.example                # names only; copy to .env.local
spec.md
roadmap.md
```

## Getting started

```bash
git clone https://github.com/brown2020/huggingface-api.git
cd huggingface-api
cp .env.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Leave `HF_USE_FIXTURES` set so the demo does not call paid providers. For live calls, set the server-only names in the table below in `.env.local` (never in the client bundle) and type the shared secret into the API key field.

## Environment variables

Names only. Do not commit real values. Do not prefix these with `NEXT_PUBLIC_`.

| Name | Role |
| --- | --- |
| `HF_TOKEN` | Hugging Face token used by the server for Inference Providers. Read at runtime. |
| `REPLICATE_API_TOKEN` | Replicate token used by the server for LLaVA captioning. Read at runtime. |
| `REPLICATE_LLAVA_13B_VERSION` | Optional pinned LLaVA version id. When unset, the server asks Replicate for the latest version. |
| `HF_USE_FIXTURES` | When `true`, handlers return labeled fixtures and do not call providers. |
| `HF_API_SECRET` | When set, `POST /api/hf` requires header `x-hf-api-key` or `Authorization: Bearer`. When unset, live calls return 503 and fixture mode still works. |

`HF_TOKEN` is captured when the server module loads. `REPLICATE_API_TOKEN` is read on each caption call. Neither is required to build or to run tests.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (`--max-warnings=0`) |
| `npm run typecheck` | `tsc --noEmit` (TypeScript 7) |
| `npm test` | Vitest |
| `npm run validate` | lint, typecheck, test, and build |

## Testing and CI

`.github/workflows/ci.yml` runs on `dev` and `main`: `npm ci --ignore-scripts`, lint, typecheck, test, and build. Test and build set `HF_USE_FIXTURES` and do not inline tokens.

## Deployment

Host it as a Next.js app. Put server-only variables in the host's secret store. Prefer fixtures on preview and CI. This repo does not change host settings.

## Contributing

Work on `dev`. Do not call paid providers unless that spend is authorized. See [`AGENTS.md`](./AGENTS.md).

## License

GNU Affero General Public License v3.0 — see [LICENSE.md](LICENSE.md).
