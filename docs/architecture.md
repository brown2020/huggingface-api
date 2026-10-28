# Architecture

## Map

| Layer | Modules | Notes |
| --- | --- | --- |
| Client UI | `src/components/HuggingFace.tsx`, `src/app/page.tsx` | Form → `fetch('/api/hf?type=...')` |
| Route | `src/app/api/hf/route.ts` | `guardApiRequest`, Zod allowlist, fixture short-circuit, HF/Replicate |
| Providers | `src/utils/hf.ts`, `src/utils/replicate.ts` | Deferred clients; `server-only` |
| Contracts | `src/utils/validation.ts` | Shared Zod schemas |
| Fixtures | `src/utils/hf-fixtures.ts` | Labeled CI/eval responses |

## Trust boundary

- Browser never receives `HF_TOKEN`, `REPLICATE_API_TOKEN`, or `HF_API_SECRET`. The demo form sends a key the operator types in; it is not bundled.
- `guardApiRequest` runs before provider calls: rate limit, `Origin` (when present), `HF_API_SECRET` (required for live calls; fixtures allowed when the secret is unset), and `Content-Length`.
- Invalid `type` → 400; disallowed model → 400; GET → 405. Fixture mode never calls paid APIs.

## Authority per write

| Mutation | Fact written | Writer | Cache owner |
| --- | --- | --- | --- |
| POST comp/translation/ttpng/imgtt | Ephemeral inference result (response body only) | `route.ts` handlers | None (no durable DB; client state only) |

## Change exercises

1. **Provider change**: remap `getBestProvider` for a model → only `hf.ts` + tests.
2. **Access / denial change**: tighten validation or GET denial → `validation.ts` / `route.ts` + route tests.
