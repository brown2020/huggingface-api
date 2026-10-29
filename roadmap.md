# Roadmap

Punchlist after the maintenance pass. No open GitHub issues were listed for this repo. Model ids and provider pins are intentionally unchanged.

## Next steps

1. Decide whether a public deploy is allowed to spend Hugging Face and Replicate credits. If yes, set `HF_API_SECRET`, `HF_TOKEN`, and `REPLICATE_API_TOKEN` in the host. Leave `HF_USE_FIXTURES` unset only for that environment. If no, keep fixtures on.
2. Confirm the host function time limit, then set `maxDuration` on `POST /api/hf` to a value that plan allows. FLUX and LLaVA often outlive short defaults, and a killed function can still leave a provider job running.
3. With spend authorized, run one live text-to-image call on `black-forest-labs/FLUX.1-dev` and see whether the always-on `negative_prompt` (`blurry` when omitted) is accepted.
4. Add a target-language control. The API already accepts `targetLang` and defaults to French; the form never sends it.
5. Replace the in-process rate limit if more than one server instance will face the public internet.
6. Recheck Hub `inferenceProviderMapping` for the catalog when a model starts failing live. Do not change ids until a mapping is actually retired.
7. Drop the `@typescript/native` alias after `@typescript-eslint` supports TypeScript 7's compiler API, then depend on `typescript@7` directly.
8. Either add `scripts/measure-budget.mjs` or stop citing it from `docs/budget.md`.

## Known bugs and limits

- **No `maxDuration`.** The route does not export one. Whether a host returns 504 is plan-specific and was not reproduced here.
- **`negative_prompt` is always sent** on text-to-image, including the default `blurry`. Not confirmed against a live FLUX endpoint.
- **Rate limit is per process.** A new instance, or a cold start, resets the 30/minute window. The address comes from `x-forwarded-for` or `x-real-ip` and is only as trustworthy as the proxy in front of the app.
- **Fixture mode without `HF_API_SECRET` is unauthenticated.** That is intentional so CI can run. It does not call paid APIs. A public fixture deployment can still be spammed up to the rate limit.
- **Translation UI is French-only.** Callers of the JSON API can pass `targetLang`.
- **TypeScript is split.** `tsc` is 7.0.2. The `typescript` package ESLint imports is 6.0.3, because typescript-eslint 8.72.1 rejects TypeScript 7.
- **Caption and image calls have no app-level abort** tied to the platform timeout.
- **A double-click can start two submits** before React disables the button.
- **`docs/budget.md` points at a script that is not in the repo.**

## Open issues

None listed on GitHub at the time of this pass.

## Deployment

Vercel project linked Oct 28, 2026 (team ignitechannel, project huggingface-api). Dev previews are at `huggingface-api-git-dev-ignitechannel.vercel.app`. The default domain is `huggingface-api-taupe.vercel.app`. Live inference needs `HF_TOKEN`, `REPLICATE_API_TOKEN`, and `HF_API_SECRET` set in Vercel; they are not set yet.

## Needs a decision

- Whether preview and production should stay on fixtures.
- The function timeout the host plan actually allows.
- Whether FLUX should keep receiving `negative_prompt` after one authorized live check.
- Whether the shared secret is enough, or the demo should stay non-public.
