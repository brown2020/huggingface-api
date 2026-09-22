# Agent notes — huggingface-api

Next.js App Router demo for Hugging Face Inference Providers (+ Replicate LLaVA captioning).

## Branch policy

- Until-100 / continuous work: push `origin/dev` only. Do not open PRs unless asked.

## Secrets / CI

- `HF_TOKEN`, `REPLICATE_API_TOKEN` are **server-only**. Never put them in `NEXT_PUBLIC_*`.
- GitHub Actions must use `${{ secrets.* }}` only — **never** inline tokens or `NEXT_PUBLIC_*` literals in workflow YAML.
- Gate job (`ci.yml`) tolerates missing secrets: tests/build set `HF_USE_FIXTURES=true`.
- Prefer deferred client init (`src/utils/hf.ts`, `src/utils/replicate.ts`) so import/SSG survives empty env.

## Paid providers

- Prefer fixtures/mocks labeled in `src/utils/hf-fixtures.ts` when `HF_USE_FIXTURES=true`.
- Fixtures **cannot** prove live provider quality, latency, or credit metering.
- Do not burn paid HF / Replicate / Fireworks credits unless explicitly authorized.

## Auth

- No first-party email/password auth. Auth UX completeness is **not applicable**.

## Scripts

- `npm run lint` / `typecheck` / `test` / `build`
