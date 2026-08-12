/**
 * Central model routing for all server-side AI generation.
 *
 * Cost strategy (pricing per million tokens, Aug 2026):
 *   - claude-sonnet-5:  $3 in / $15 out ($2/$10 intro through 2026-08-31).
 *     Near-Opus writing quality — the workhorse for all editorial content.
 *   - claude-haiku-4-5: $1 in / $5 out. For mechanical tasks only:
 *     classification, tagging, extraction, short summaries.
 *
 * Rules:
 *   - Never hardcode a model ID in a lib or route — import from here.
 *   - Sonnet 5 rejects temperature/top_p/top_k (400) and runs adaptive
 *     thinking by default; don't add sampling params.
 *   - effort/output_config is NOT supported on Haiku 4.5 — don't pass it
 *     to CLASSIFIER_MODEL calls.
 *   - All content pipelines are cron-driven (not latency-sensitive); if
 *     monthly spend grows past ~$100, move them to the Batches API for a
 *     50% discount.
 */
export const EDITORIAL_MODEL = 'claude-sonnet-5';
export const CLASSIFIER_MODEL = 'claude-haiku-4-5';
