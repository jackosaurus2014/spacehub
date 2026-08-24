// ─── AI-insight duplicate detection ─────────────────────────────────────────
// Born 2026-08-24: the insight generator covered the LandSpace Zhuque-3
// landing three days in a row under three different titles. Two of the three
// were then approved from the review email, because nothing anywhere said
// "this story is already covered". Two gaps, both closed here:
//
//   1. The generator never saw its own recent output — the prompt carried
//      recent news and blogs but not recent INSIGHTS, so re-covering a story
//      looked like fresh work to the model.
//   2. Even when a near-duplicate was generated, no mechanical check caught
//      it before upsert, and the review email carried no duplicate warning
//      for the human decision.
//
// The similarity test is deliberately dumb and transparent: shared
// distinctive title tokens. Titles about one story share its proper nouns
// ("landspace", "zhuque") no matter how the headline is spun. Embeddings
// would be stronger but this needs to be cheap, dependency-free, and
// explainable in a log line.

/** Words too common in space-news headlines to signal shared subject. */
const STOP_TOKENS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'over', 'after', 'before',
  'space', 'launch', 'launches', 'launched', 'mission', 'rocket', 'orbit',
  'orbital', 'satellite', 'satellites', 'nasa', 'china', 'chinas', 'us',
  'first', 'second', 'third', 'new', 'its', 'his', 'her', 'their', 'this',
  'that', 'what', 'how', 'why', 'ends', 'era', 'race', 'week', 'year',
  'breakthrough', 'historic', 'major', 'milestone', 'success', 'successful',
  'americas', 'commercial', 'industry', 'company', 'billion', 'million',
  // Added after a false-positive scan over the full production catalogue:
  // function words and headline connective tissue that slipped past the
  // length filter and formed spurious "rare pairs".
  'where', 'will', 'when', 'here', 'there', 'into', 'onto', 'amid',
  'signals', 'shift', 'shifts', 'record', 'critical', 'faces', 'exposes',
]);

/** Distinctive lowercase tokens of a title, order-free. */
export function distinctiveTokens(title: string): Set<string> {
  const out = new Set<string>();
  for (const raw of title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 4) continue;
    if (STOP_TOKENS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

/**
 * Entities that appear in space headlines constantly. Sharing two of THESE
 * says nothing ("spacex" + "starship" describes half the week's news), so
 * they never satisfy the rare-pair rule below — only volume-based overlap.
 * Sharing two tokens NOT on this list ("landspace" + "zhuque") is a
 * near-certain same-story signal, which is exactly how the three Zhuque
 * headlines relate despite sharing little else.
 */
const FREQUENT_ENTITIES = new Set([
  'spacex', 'starship', 'starlink', 'falcon', 'heavy', 'dragon',
  'artemis', 'orion', 'gateway', 'blue', 'origin', 'glenn', 'shepard',
  'boeing', 'starliner', 'ariane', 'vulcan', 'electron', 'neutron',
  'moon', 'lunar', 'mars', 'martian', 'station', 'crew', 'astronaut',
  'landing', 'booster', 'reusable', 'reusability', 'flight', 'test',
  // Sector vocabulary that recurs across unrelated stories — counts toward
  // the volume rules, never toward a rare pair (false-positive scan finds).
  'defense', 'military', 'force', 'integration', 'accelerates', 'economy',
  'state', 'investment', 'market', 'funding', 'budget', 'regulation',
  'regulatory', 'nuclear', 'sector', 'strategic',
]);

export interface DuplicateVerdict {
  duplicate: boolean;
  sharedTokens: string[];
  overlapRatio: number;
}

/**
 * Do two titles cover the same story? Three routes to yes, calibrated
 * against the real incident (all three Zhuque titles must match each other;
 * none may match unrelated same-day headlines):
 *   - two or more shared RARE tokens — proper nouns outside the
 *     frequent-entity list co-occurring is a near-certain story match;
 *   - four or more shared tokens of any kind;
 *   - three shared tokens covering ≥40% of the smaller title's vocabulary.
 */
export function titlesCoverSameStory(a: string, b: string): DuplicateVerdict {
  // Recurring franchise titles ("State of the Space Economy — Week of X",
  // "Regulatory Radar — Week of Y") are the same headline every week BY
  // DESIGN. Two entries of a dated series are never duplicates of each other.
  if (/week of/i.test(a) && /week of/i.test(b)) {
    return { duplicate: false, sharedTokens: [], overlapRatio: 0 };
  }
  const ta = distinctiveTokens(a);
  const tb = distinctiveTokens(b);
  const shared: string[] = [];
  for (const t of Array.from(ta)) if (tb.has(t)) shared.push(t);
  const rare = shared.filter((t) => !FREQUENT_ENTITIES.has(t));
  const denom = Math.min(ta.size, tb.size) || 1;
  const ratio = shared.length / denom;
  return {
    duplicate:
      rare.length >= 2 ||
      shared.length >= 4 ||
      (shared.length >= 3 && ratio >= 0.4),
    sharedTokens: shared,
    overlapRatio: ratio,
  };
}

export interface RecentInsightLite {
  title: string;
  slug: string;
  status: string;
}

export interface DuplicateHit {
  slug: string;
  title: string;
  status: string;
  sharedTokens: string[];
}

/**
 * First recent insight that already covers the candidate's story, or null.
 * `rejected` rows count — a story the editor explicitly killed must not
 * come back the next morning under a fresh headline.
 */
export function findLikelyDuplicate(
  candidateTitle: string,
  recent: RecentInsightLite[],
): DuplicateHit | null {
  for (const r of recent) {
    const verdict = titlesCoverSameStory(candidateTitle, r.title);
    if (verdict.duplicate) {
      return { slug: r.slug, title: r.title, status: r.status, sharedTokens: verdict.sharedTokens };
    }
  }
  return null;
}

/**
 * Prompt block listing recently covered stories, injected into the
 * generation prompt so the model steers away from them by itself — the
 * mechanical guard above is the backstop, not the plan.
 */
export function buildRecentCoverageBlock(recent: RecentInsightLite[]): string {
  if (recent.length === 0) return '';
  const lines = recent.slice(0, 40).map((r) => `- ${r.title}`);
  return [
    '## Stories already covered (do NOT write about these again)',
    'The following insights were already generated in the last two weeks.',
    'Do not produce another piece on the same story or event, even under a',
    'different angle or headline. If there is a genuinely NEW development in',
    'one of these stories, the piece must lead with the new development and',
    'must not restate the original event as if it were news.',
    ...lines,
  ].join('\n');
}
