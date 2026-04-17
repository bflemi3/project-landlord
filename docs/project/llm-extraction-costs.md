# LLM Contract Extraction — Cost Analysis

**Date:** 2026-04-16
**Context:** Contract-driven property creation uses LLM-based extraction to parse rental contracts into structured data.

---

## Architecture

- **AI SDK:** Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — open-source, free, no per-request fees
- **LLM Provider:** Anthropic (Claude) — pay per token
- **Compute:** Vercel Serverless Functions — pay per execution time
- **Frequency:** Runs once per property creation (not recurring)

---

## Cost Breakdown Per Extraction

Typical contract: ~5,500 input tokens, ~800 output tokens.

### LLM Provider (Anthropic)

| Model | Input cost | Output cost | Total |
|---|---|---|---|
| Haiku 4.5 | ~$0.005 | ~$0.005 | **~$0.01** |
| Sonnet 4.6 | ~$0.02 | ~$0.012 | **~$0.03** |
| Opus 4.6 | ~$0.09 | ~$0.06 | **~$0.15** |

**Prompt caching:** System prompt can be cached across calls (Anthropic prompt caching). On cache hits, input costs drop ~90%. Repeat extractions in the same session could be ~$0.01 on Sonnet.

### Vercel Serverless Compute

- Extraction call takes ~3-10 seconds
- Pro plan ($20/mo): 1,000 GB-hours included
- Single extraction at 1GB memory for 10 seconds = ~0.003 GB-hours
- **~330,000 extractions before hitting the included limit**
- Overage: $0.18/GB-hour (~$0.0005 per extraction)

### AI SDK

Free. Open-source client library (MIT license). No per-request or per-token fee.

---

## Total Cost Per Extraction

| Component | Cost (Sonnet) |
|---|---|
| Anthropic tokens | ~$0.03 |
| Vercel compute | ~$0.0005 |
| **Total** | **~$0.03** |

---

## At Scale

| Properties/month | Cost (Sonnet) | Cost (Haiku) |
|---|---|---|
| 10 | ~$0.30 | ~$0.10 |
| 100 | ~$3.00 | ~$1.00 |
| 1,000 | ~$30.00 | ~$10.00 |
| 10,000 | ~$300.00 | ~$100.00 |

---

## Recommendations

- **Start with Sonnet 4.6** — best accuracy-to-cost ratio for structured extraction
- **If Haiku proves accurate during testing, downgrade** — 3x cheaper
- **Enable prompt caching** — system prompt is the same across all extractions
- **No hidden Vercel costs** — no AI gateway fee, no AI surcharge, just standard compute + provider tokens
- **Monitor GB-hours** on the Pro plan to avoid overage (unlikely to be an issue at early scale)

---

## Key Facts

- This runs **once per property creation**, not recurring
- Costs are negligible at early scale (Alex's 3 properties = ~$0.09)
- The AI SDK is provider-agnostic — can swap to OpenAI, Google, etc. without code changes
- Vercel AI Gateway (caching, observability) is optional and not required
