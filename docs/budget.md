# Runtime budget

| Metric | Budget | Critical path | Notes |
| --- | --- | --- | --- |
| Home document (built HTML) | ≤ 100 KB transfer | `GET /` | Static shell + client JS chunk separately |
| Fixture completion POST | ≤ 200 ms local | `POST /api/hf?type=comp` with `HF_USE_FIXTURES=true` | Excludes live provider latency |

Measure with `scripts/measure-budget.mjs` or documented curl/time after `next start`.
