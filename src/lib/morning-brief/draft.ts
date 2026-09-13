// SpaceNexus AM — the Sonnet draft (2026-09-12). The model writes the
// headline and the why-it-matters line for each ranked story and may attach
// ONE SpaceNexus route from the closed candidate list. It never sees a free
// URL field: story URLs, sources, and dates come from the NewsArticle rows
// and are mapped back by index after the call, so the only thing it can get
// wrong is prose — and the gates re-check lengths and every href.

import Anthropic from '@anthropic-ai/sdk';
import { EDITORIAL_MODEL } from '@/lib/ai-models';
import { createMessageStreamed } from '@/lib/anthropic-stream';
import { extractJsonObject } from '@/lib/loose-json';
import { logger } from '@/lib/logger';
import type { PoolArticle } from './select';
import type { RouteCandidate } from './routes';
import { validateInternalHref, routeAllowSet } from './routes';
import type { MorningBriefStory } from './types';
import { HEADLINE_MAX, WHY_MAX } from './types';

export interface DraftInput {
  now: Date;
  stories: PoolArticle[];
  routes: RouteCandidate[];
}

export interface DraftOutput {
  stories: MorningBriefStory[];
  /** Raw stop_reason for the ledger. */
  stopReason: string | null;
}

/** Signature the orchestrator accepts, so tests and the preview script can inject a fake. */
export type DraftFn = (input: DraftInput) => Promise<DraftOutput>;

interface ModelStory {
  index?: number;
  headline?: string;
  whyItMatters?: string;
  internalHref?: string | null;
}

const VOICE = `You write SpaceNexus AM, a weekday morning brief for people who work in or follow the space industry. Voice: direct, specific, no hype, no exclamation marks, no "exciting", no "game-changer". Lead with the fact. Numbers, names, and dates beat adjectives. Write like a sharp colleague summarising the morning, not a press release.`;

export function buildDraftPrompt(input: DraftInput): string {
  const stories = input.stories
    .map((s, i) => {
      const summary = (s.summary ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
      const tags = s.companySlugs?.length ? `\n   tagged companies: ${s.companySlugs.map((x) => `/company-profiles/${x}`).join(', ')}` : '';
      return `${i + 1}. [${s.category}] ${s.title}\n   source: ${s.source} · published ${s.publishedAt.toISOString()}\n   ${summary || '(no summary)'}${tags}`;
    })
    .join('\n\n');
  const routes = input.routes.map((r) => `${r.href} — ${r.label}: ${r.hint}`).join('\n');
  return `${VOICE}

Today is ${input.now.toISOString().slice(0, 10)} (UTC). Below are the stories chosen for this issue, in order. For EACH story write:
- "headline": our own headline, at most ${HEADLINE_MAX} characters, factual, no source name in it;
- "whyItMatters": one sentence, at most ${WHY_MAX} characters, saying why a reader in the industry should care today (what changes, who is affected, what to watch);
- "internalHref": at most ONE route copied EXACTLY from the SpaceNexus routes list below when it is genuinely related (a tracker, guide, rocket page, or the profile of a company the story is about); otherwise null. Never invent a route. Never link a route that is only loosely related.

Do not change the order, do not drop or merge stories, do not add stories.

STORIES
${stories}

SPACENEXUS ROUTES (the only internal links allowed)
${routes}

Respond with valid JSON only, in exactly this shape:
{"stories":[{"index":1,"headline":"...","whyItMatters":"...","internalHref":"/guide/example-or-null"}]}`;
}

/**
 * Map the model's per-index prose back onto the pool rows. Unknown indexes
 * are dropped; missing/invalid hrefs become null; nothing else is trusted.
 */
export function mergeDraft(input: DraftInput, modelStories: ModelStory[]): MorningBriefStory[] {
  const allow = routeAllowSet(input.routes);
  const labelFor = new Map(input.routes.map((r) => [r.href, r.label]));
  const out: MorningBriefStory[] = [];
  const used = new Set<number>();
  for (const ms of modelStories) {
    const idx = typeof ms.index === 'number' ? ms.index - 1 : -1;
    const src = input.stories[idx];
    if (!src || used.has(idx)) continue;
    used.add(idx);
    const href = validateInternalHref(ms.internalHref, allow);
    out.push({
      headline: (ms.headline ?? '').replace(/\s+/g, ' ').trim(),
      whyItMatters: (ms.whyItMatters ?? '').replace(/\s+/g, ' ').trim(),
      source: src.source,
      url: src.url,
      category: src.category,
      publishedAt: src.publishedAt.toISOString(),
      internalHref: href,
      internalLabel: href ? labelFor.get(href) ?? null : null,
    });
  }
  // Keep the pool order (lead story first) regardless of how the model ordered its array.
  return out.sort((a, b) => input.stories.findIndex((s) => s.url === a.url) - input.stories.findIndex((s) => s.url === b.url));
}

/** Live Sonnet draft. Throws on a truncated or unparseable reply so the gates record it. */
export const draftWithSonnet: DraftFn = async (input) => {
  const anthropic = new Anthropic();
  const response = await createMessageStreamed(anthropic, {
    model: EDITORIAL_MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: buildDraftPrompt(input) }],
  });
  const stopReason = response.stop_reason ?? null;
  if (stopReason && stopReason !== 'end_turn' && stopReason !== 'stop_sequence') {
    throw new Error(`model stopped early (${stopReason})`);
  }
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('model reply had no text block');
  const parsed = extractJsonObject<{ stories?: ModelStory[] }>(text.text);
  if (!parsed || !Array.isArray(parsed.stories)) throw new Error('model reply did not contain a stories array');
  const stories = mergeDraft(input, parsed.stories);
  logger.info('morning-brief: draft received', { requested: input.stories.length, returned: stories.length, stopReason });
  return { stories, stopReason };
};
