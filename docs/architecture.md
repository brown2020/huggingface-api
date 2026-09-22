# Architecture

## Map

| Layer | Modules | Notes |
| --- | --- | --- |
| Client UI | `src/components/HuggingFace.tsx`, `src/app/page.tsx` | Form → `fetch('/api/hf?type=...')` |
| Route | `src/app/api/hf/route.ts` | Zod validation; fixture short-circuit; HF/Replicate calls |
| Providers | `src/utils/hf.ts`, `src/utils/replicate.ts` | Deferred clients; `server-only` |
| Contracts | `src/utils/validation.ts` | Shared Zod schemas |
| Fixtures | `src/utils/hf-fixtures.ts` | Labeled CI/eval responses |

## Trust boundary

- Browser never receives `HF_TOKEN` / `REPLICATE_API_TOKEN`.
- Authority stops at the route handler: invalid `type` → 400; GET → 405; missing tokens → 500 with safe message (live mode only).
- Fixture mode never calls paid APIs.

## Authority per write

| Mutation | Fact written | Writer | Cache owner |
| --- | --- | --- | --- |
| POST comp/translation/ttpng/imgtt | Ephemeral inference result (response body only) | `route.ts` handlers | None (no durable DB; client state only) |

## Change exercises

1. **Provider change**: remap `getBestProvider` for a model → only `hf.ts` + tests.
2. **Access / denial change**: tighten validation or GET denial → `validation.ts` / `route.ts` + route tests.
