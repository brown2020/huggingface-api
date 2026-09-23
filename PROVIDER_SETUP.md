# Setting Up Inference Providers

Hugging Face routes Inference API calls through third-party **Inference Providers**
(Fireworks, Replicate, fal.ai, DeepInfra, Novita, Featherless, etc.). Model ids must
match Hub ids exactly (casing matters), and each model must have a live
`inferenceProviderMapping` entry.

## What broke (and the fix)

Legacy default `deepseek-ai/deepseek-v3-0324` (wrong casing) + hardcoded
`fireworks-ai` failed with:

> We have not been able to find inference provider information for model …

**Fix:** catalog defaults to `deepseek-ai/DeepSeek-V3-0324` with provider `auto`
(Hub currently serves it via DeepInfra / Featherless). Text-to-image defaults to
`black-forest-labs/FLUX.1-dev` with `auto`. See `src/utils/models.ts`.

## Recommended defaults (2026-09)

| Task | Model | Provider |
|------|--------|----------|
| Chat / translation | `deepseek-ai/DeepSeek-V3-0324` | `auto` |
| Chat (reasoning) | `deepseek-ai/DeepSeek-R1` | `novita` / `auto` |
| Chat (small) | `meta-llama/Llama-3.1-8B-Instruct` | `auto` |
| Text-to-image | `black-forest-labs/FLUX.1-dev` | `auto` |
| Text-to-image (SDXL) | `stabilityai/stable-diffusion-xl-base-1.0` | `fal-ai` |

Verify live mappings:

```bash
curl -sS "https://huggingface.co/api/models/MODEL_ID?expand=inferenceProviderMapping"
```

Or browse https://huggingface.co/inference/models

## Env

- `HF_TOKEN` — required for live Inference Providers (server-only)
- `REPLICATE_API_TOKEN` — LLaVA image captioning fallback
- `HF_USE_FIXTURES=true` — CI / app-eval (no paid calls)

## Routing policy

1. UI catalog (`src/utils/models.ts`) — only models known to be provider-backed
2. Explicit overrides in `getBestProvider` (`src/utils/hf.ts`)
3. Task fallback → `auto` so HF picks a live provider (avoids stale Fireworks maps)

## Links

- [Inference Providers docs](https://huggingface.co/docs/inference-providers)
- [Supported models](https://huggingface.co/inference/models)
