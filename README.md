# Hugging Face API Demo

Small Next.js App Router demo for Hugging Face Inference Providers (chat completion, translation, text-to-image) plus Replicate LLaVA image captioning. No auth or payments — server routes call providers with tokens from `.env.local`.

## Features

- **Text completion** — chat via `@huggingface/inference` with provider routing
- **Translation** — same chat path with a translation prompt
- **Image to text** — captioning via Replicate (LLaVA-13B)
- **Text to image** — PNG generation via HF `textToImage`
- **Fixtures mode** — `HF_USE_FIXTURES=true` returns labeled fixtures (no paid credits)
- Zod-validated request bodies on `POST /api/hf`

See [`PROVIDER_SETUP.md`](./PROVIDER_SETUP.md) for current default model / provider mappings.

## Tech stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js ^16.3.6 (App Router) |
| UI | React ^19.3.0, Tailwind CSS ^4.3.3, react-spinners |
| Language | TypeScript ^6.0.3 |
| HF | `@huggingface/inference` ^4.13.15 |
| Replicate | `replicate` ^1.4.0 |
| Validation | Zod ^4.3.6 |
| Tests | Vitest ^5.0.1, ESLint 10 |

Requires Node.js `>= 20.9.0` (CI uses 22).

## Project structure

```
src/
  app/
    page.tsx           # Renders HuggingFace demo UI
    api/hf/route.ts    # Unified POST handler (comp | translation | imgtt | ttpng)
  components/HuggingFace.tsx
  utils/               # hf.ts, replicate.ts, models.ts, validation, fixtures
.github/workflows/ci.yml
.env.example
```

## Getting started

```bash
git clone https://github.com/brown2020/huggingface-api.git
cd huggingface-api
cp .env.example .env.local
# Set HF_TOKEN and REPLICATE_API_TOKEN for live calls, or HF_USE_FIXTURES=true
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Name | Purpose | Where to get it |
| --- | --- | --- |
| `HF_TOKEN` | Hugging Face Inference API token (server-only) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `REPLICATE_API_TOKEN` | Replicate token for LLaVA captioning (server-only) | [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) |
| `REPLICATE_LLAVA_13B_VERSION` | Optional pinned LLaVA version hash | Replicate model page (optional) |
| `HF_USE_FIXTURES` | When `true`, use fixtures instead of live providers | Set `true` for local/CI without burning credits |

Never expose these as `NEXT_PUBLIC_*`. Never commit real values.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint (`--max-warnings=0`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run validate` | lint + typecheck + test + build |

## Testing and CI

- Unit tests cover HF helpers and Zod validation; set `HF_USE_FIXTURES=true` in CI.
- `.github/workflows/ci.yml` on `dev` / `main`: lint → typecheck → test → build (fixtures enabled; no inline secrets).

## Deployment

Any Next.js host (e.g. Vercel). Configure server-only secrets in the host dashboard. Prefer fixtures in preview/CI.

## Contributing

Work on `dev`. Prefer fixtures over live paid calls unless authorized. See [`AGENTS.md`](./AGENTS.md).

## License

GNU Affero General Public License v3.0 — see [LICENSE.md](LICENSE.md).
