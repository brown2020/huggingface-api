# HuggingFace API Integration with Next.js (App Router)

Demo application integrating Hugging Face Inference Providers with a Next.js App Router app: text completion, translation, image-to-text (Replicate LLaVA), and text-to-image.

## Features

- **Text Completion:** Chat completions via Hugging Face Inference + provider routing.
- **Translation:** Same chat completion path with a translation prompt.
- **Image to Text:** Image captioning via Replicate (LLaVA-13B).
- **Text to Image:** PNG generation via HF Inference `textToImage`.

## Tech Stack (current)

Pinned via `package-lock.json` (see `npm ls` for exact installs):

- **Next.js**: `16.3.x`
- **React / React DOM**: `19.3.x`
- **Hugging Face Inference SDK**: `@huggingface/inference`
- **Replicate SDK**: `replicate`
- **Validation**: `zod`

### Runtime requirements

- **Node.js**: `>= 20.9.0`

## Getting Started

1. Clone and `npm install` (or `npm ci`).
2. Copy `.env.example` to `.env.local` and set secrets (never commit them):

```bash
HF_TOKEN=your_huggingface_token_here
REPLICATE_API_TOKEN=your_replicate_token_here
# Optional for CI/eval without paid calls:
HF_USE_FIXTURES=true
```

3. `npm run dev` → http://localhost:3000

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (fixtures; no live HF) |
| `npm run build` | Production build |

## CI

GitHub Actions (`ci.yml`) runs lint, typecheck, test, and build with `HF_USE_FIXTURES=true`. Secrets are optional for the gate. **Never inline** `HF_TOKEN` / `REPLICATE_*` / `NEXT_PUBLIC_*` in workflow YAML — use `${{ secrets.* }}` only if a future smoke job needs them.

## Fixtures

When `HF_USE_FIXTURES=true`, `/api/hf` returns labeled fixture responses (`src/utils/hf-fixtures.ts`) and does not call paid providers. Fixtures cannot prove live quality, latency, or credit metering.

## Auth

This demo has **no** first-party email/password authentication.

## API

`POST /api/hf?type=comp|translation|imgtt|ttpng` — see `src/app/api/hf/route.ts`.  
`GET /api/hf` returns **405**.

## Provider setup

See [PROVIDER_SETUP.md](./PROVIDER_SETUP.md) and [AGENTS.md](./AGENTS.md).

## License

GNU Affero General Public License v3.0 (AGPL-3.0). See `LICENSE.md`.
