import type Anthropic from '@anthropic-ai/sdk';

/**
 * Long-form generation must stream (2026-09-10). @anthropic-ai/sdk 0.78
 * refuses a non-streaming `messages.create` whose max_tokens implies more
 * than ~10 minutes of output ("Streaming is required for operations that
 * may take longer than 10 minutes"). The daily AI-insights run died on that
 * every night from 2026-08-31 to 2026-09-10 — the feed went silent and
 * nothing in the logs reached anyone. This wrapper streams and returns the
 * assembled final message, so call sites keep their `response.content`
 * handling unchanged. Use it for any call with max_tokens ≥ 8,000.
 */
export async function createMessageStreamed(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const stream = client.messages.stream(params);
  return stream.finalMessage();
}
