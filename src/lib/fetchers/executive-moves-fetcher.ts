// ─── Executive Moves Fetcher ─────────────────────────────────────────────────
// Scans news articles for executive-level personnel changes and extracts
// structured move data (person, title, company, move type).
// Uses keyword matching + pattern extraction from existing news feed.
//
// HARDENING (2026-08): the original version regex-scanned ALL NewsArticle
// rows for loose keywords ("named", "joins", "director"...) with no
// name-shape validation or topic filtering. That produced garbled fragments
// like personName = "a Soviet lieutenant colonel" or "The most secretive
// facility of the Cold War is" — full sentence clauses pulled out of
// historical/feature articles that happened to contain a keyword. This file
// now validates every extracted field against shape heuristics
// (isLikelyPersonName / isLikelyTitle / isLikelyOrg) before it's ever
// written to the DB, and restricts source articles to headlines that look
// like actual appointment/personnel news.

import prisma from '../db';
import { logger } from '../logger';

const EXEC_KEYWORDS = [
  'CEO', 'CTO', 'CFO', 'COO', 'CIO', 'CHRO', 'CLO',
  'President', 'Vice President', 'VP',
  'Chief', 'Director', 'Head of',
  'appointed', 'named', 'hired', 'promoted',
  'stepped down', 'resigned', 'departed', 'retired',
  'joins', 'joined', 'joining',
  'board of directors', 'board member',
];

// Titles that contain an exec keyword but are clearly historical/feature
// pieces, not personnel news, e.g. "The Secret History of the Cold War
// Space Race" (contains "Director"-adjacent prose) or "Remembering Apollo's
// Flight Directors, 50 Years Later". Checked against the article TITLE only.
const HISTORICAL_FEATURE_BLOCKLIST = [
  'history', 'historical', 'histories',
  'cold war', 'anniversary', 'decades ago', 'years ago', 'years later',
  'retrospective', 'looking back', 'looks back', 'remembers', 'remembering',
  'origins of', 'story of', 'declassified', 'on this day',
  'today in space history', 'throwback',
];

/**
 * Article-level eligibility gate: only scan articles whose TITLE (not just
 * body text) plausibly indicates business/personnel news, and skip
 * obviously historical or feature pieces.
 */
export function isEligibleExecMoveArticle(title: string | null | undefined): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  const hasExecKeywordInTitle = EXEC_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  if (!hasExecKeywordInTitle) return false;
  if (HISTORICAL_FEATURE_BLOCKLIST.some(term => lower.includes(term))) return false;
  return true;
}

// ─── Field validators ─────────────────────────────────────────────────────
// Pure, DB-free functions so they're cheaply unit-testable and reusable
// both by the fetcher (gating what gets written) and by the API route
// (gating what gets rendered, as defense in depth against any bad rows
// already in the table).

const PERSON_NAME_MAX_LENGTH = 40;
const PERSON_NAME_TOKEN_MIN = 2;
const PERSON_NAME_TOKEN_MAX = 4;

// Words that mark a candidate "name" as a sentence fragment scraped out of
// prose rather than an actual person's name: articles, pronouns,
// prepositions, conjunctions, and other common sentence-shape words.
// Checked against every token, case-insensitively.
const NON_NAME_WORDS = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'it', 'its', 'he', 'she', 'they', 'we', 'i', 'his', 'her', 'their', 'our', 'your', 'my',
  'is', 'was', 'were', 'are', 'be', 'been', 'being', 'has', 'have', 'had',
  'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'about',
  'and', 'or', 'but', 'if', 'then', 'than', 'so', 'because', 'since', 'while',
  'usually', 'often', 'most', 'some', 'many', 'several', 'all', 'any', 'no', 'not',
  'also', 'only', 'just', 'even', 'still', 'yet', 'however', 'therefore', 'thus',
  'which', 'who', 'whom', 'whose', 'what', 'where', 'when', 'why', 'how',
  'there', 'here',
]);

// A single "word" that could plausibly be part of a person's name: starts
// with a capital letter, then letters/apostrophes/hyphens/diacritics,
// optional trailing period for initials (e.g. "J.", "O'Brien", "Jean-Luc").
const NAME_TOKEN_RE = /^\p{Lu}[\p{L}'-]*\.?$/u;

/**
 * True if `raw` looks like the name of a real person: 2-4 capitalized
 * tokens, no sentence/stopwords, under 40 chars, no digits.
 */
export function isLikelyPersonName(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const name = raw.trim();
  if (!name || name.length >= PERSON_NAME_MAX_LENGTH) return false;
  if (/\d/.test(name)) return false;

  const tokens = name.split(/\s+/);
  if (tokens.length < PERSON_NAME_TOKEN_MIN || tokens.length > PERSON_NAME_TOKEN_MAX) return false;

  for (const token of tokens) {
    const bare = token.replace(/\.$/, '');
    if (NON_NAME_WORDS.has(bare.toLowerCase())) return false;
    if (!NAME_TOKEN_RE.test(token)) return false;
  }

  return true;
}

const TITLE_MAX_LENGTH = 60;
const TITLE_MAX_WORDS = 8;

const ROLE_KEYWORDS = [
  'ceo', 'cto', 'cfo', 'coo', 'cio', 'chro', 'clo', 'cmo', 'cro', 'cpo',
  'president', 'vice president', 'vp',
  'chief', 'head of', 'general manager', 'managing director',
  'founder', 'co-founder', 'chairman', 'chairwoman', 'chairperson', 'chair',
  'board member', 'board of directors', 'director', 'administrator',
  'executive director', 'partner', 'principal', 'officer',
];

// Words that mark a candidate "title" as a sentence fragment rather than a
// role name, checked against every word in the string.
const SENTENCE_INDICATOR_WORDS = new Set([
  'is', 'was', 'were', 'are', 'has', 'have', 'had', 'will', 'would',
  'said', 'stated', 'announced', 'according', 'because', 'although',
  'however', 'today', 'yesterday', 'usually', 'often', 'reportedly',
]);

/**
 * True if `raw` looks like a plausible job title: under 60 chars, contains
 * a recognizable role keyword (CEO, director, head of, etc.), and doesn't
 * read like a sentence fragment.
 */
export function isLikelyTitle(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const title = raw.trim();
  if (!title || title.length >= TITLE_MAX_LENGTH) return false;

  const lower = title.toLowerCase();
  const hasRoleKeyword = ROLE_KEYWORDS.some(kw => {
    const re = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return re.test(lower);
  });
  if (!hasRoleKeyword) return false;

  const words = title.split(/\s+/);
  if (words.length > TITLE_MAX_WORDS) return false;

  for (const w of words) {
    const bare = w.toLowerCase().replace(/[.,;:]$/, '');
    if (SENTENCE_INDICATOR_WORDS.has(bare)) return false;
  }

  return true;
}

const ORG_MAX_LENGTH = 60;
const ORG_MAX_WORDS = 8;

const ORG_SENTENCE_INDICATOR_WORDS = new Set([
  'is', 'was', 'were', 'are', 'has', 'have', 'had', 'will', 'would',
  'said', 'stated', 'announced', 'according', 'because', 'although',
  'however', 'usually', 'often', 'today', 'yesterday', 'reportedly',
]);

/**
 * True if `raw` looks like a plausible organization name: under 60 chars,
 * starts with a capital letter or digit, no verb/sentence shape.
 */
export function isLikelyOrg(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const org = raw.trim();
  if (!org || org.length >= ORG_MAX_LENGTH) return false;
  if (!/^[A-Z0-9]/.test(org)) return false;
  if (/[.!?]$/.test(org)) return false;

  const words = org.split(/\s+/);
  if (words.length > ORG_MAX_WORDS) return false;

  for (const w of words) {
    const bare = w.toLowerCase().replace(/[.,;:]$/, '');
    if (ORG_SENTENCE_INDICATOR_WORDS.has(bare)) return false;
  }

  return true;
}

// ─── Known-company matching (confidence boost, not a hard gate) ──────────
// Matching a known company doesn't affect acceptance — a legitimate move at
// a company we haven't seeded to CompanyProfile should still be storable —
// but it strongly boosts confidence, so it's used to set `verified: true`.

const INDUSTRY_ORG_KEYWORDS = [
  'space', 'aerospace', 'astronautics', 'rocket', 'satellite', 'orbital',
  'launch', 'propulsion', 'defense', 'systems', 'technologies', 'dynamics',
  'industries', 'holdings', 'corporation', 'incorporated', 'inc', 'llc',
  'ltd', 'corp', 'group', 'labs', 'laboratory', 'agency', 'administration',
  'command', 'force', 'nasa', 'esa', 'jaxa', 'isro', 'roscosmos', 'faa',
  'fcc', 'university', 'institute',
];

/** Loose fallback confidence signal when there's no CompanyProfile match. */
export function isIndustryKeywordOrg(raw: string): boolean {
  const lower = raw.toLowerCase();
  return INDUSTRY_ORG_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lower));
}

function normalizeOrgName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\b(inc|llc|ltd|corp|corporation|co)\b/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * True if `raw` matches (exactly, or via substring containment guarded by a
 * minimum length) a name in `knownNames` — expected to be the normalized
 * set of CompanyProfile.name values.
 */
export function isKnownOrgName(raw: string | null | undefined, knownNames: ReadonlySet<string>): boolean {
  if (!raw) return false;
  const norm = normalizeOrgName(raw);
  if (!norm) return false;
  if (knownNames.has(norm)) return true;
  if (norm.length < 4) return false;
  let matched = false;
  knownNames.forEach((known) => {
    if (matched || known.length < 4) return;
    if (norm.includes(known) || known.includes(norm)) matched = true;
  });
  return matched;
}

/** Loads and normalizes CompanyProfile names once per fetcher run. */
export async function loadKnownCompanyNames(): Promise<Set<string>> {
  try {
    const companies = await prisma.companyProfile.findMany({ select: { name: true } });
    return new Set(companies.map(c => normalizeOrgName(c.name)).filter(Boolean));
  } catch (err) {
    logger.error('executive-moves: failed to load known company names', { error: String(err) });
    return new Set();
  }
}

// ─── Extraction ────────────────────────────────────────────────────────────

interface ExtractedMove {
  personName: string;
  toTitle: string | null;
  toCompany: string | null;
  fromTitle: string | null;
  fromCompany: string | null;
  moveType: string;
  source: string;
  sourceUrl: string;
  summary: string;
  verified: boolean;
}

interface MovePatternDef {
  regex: RegExp;
  // Normalizes each pattern's capture groups to a common {person, title,
  // company} shape. The three source patterns don't share group order (the
  // "joins" pattern captures company before title), so this mapping used to
  // be applied blindly — silently swapping toTitle/toCompany for that
  // pattern. Each pattern now declares its own group order explicitly.
  extract: (m: RegExpMatchArray) => { person: string; title: string; company: string };
}

// The `g` flag matters more than it looks: extraction used to take ONE match
// per pattern per article (String.match, no /g), on title+summary
// concatenated. Summaries usually contain a keyword earlier in prose, so the
// single attempt landed on an invalid sentence fragment, the validators
// (correctly) rejected it, and the pattern never got a second chance. Result:
// the fetcher found literally nothing for months while real appointments sat
// in the headlines — measured on a 30-day corpus: 178 eligible articles,
// 0 extractions with the old logic. Every occurrence is now a candidate, and
// validators pick the survivors.
const MOVE_PATTERNS: MovePatternDef[] = [
  {
    // "X appointed as CEO of Y"
    regex: /(\w[\w\s.'-]+?)\s+(?:has been\s+)?(?:appointed|named|hired|promoted)\s+(?:as\s+)?(.+?)\s+(?:of|at|for)\s+(.+?)(?:\.|,|$)/gi,
    extract: (m) => ({ person: m[1], title: m[2], company: m[3] }),
  },
  {
    // "X joins Y as CEO"
    regex: /(\w[\w\s.'-]+?)\s+(?:joins|joined|joining)\s+(.+?)\s+as\s+(.+?)(?:\.|,|$)/gi,
    extract: (m) => ({ person: m[1], title: m[3], company: m[2] }),
  },
  {
    // "Y appoints X as CEO" / "Y names X to lead Z" — the dominant
    // press-release headline form, company-first. All prior patterns were
    // person-first, so wire-style appointment headlines never matched.
    regex: /(\w[\w\s.'&-]+?)\s+(?:appoints|names|hires|promotes)\s+(.+?)\s+(?:as\s+|to\s+(?:be\s+)?)(.+?)(?:\.|,|$)/gi,
    extract: (m) => ({ person: m[2], title: m[3], company: m[1] }),
  },
  {
    // "X steps down as CEO of Y"
    regex: /(\w[\w\s.'-]+?)\s+(?:steps down|stepped down|resigned|departed|retired)\s+(?:as\s+)?(.+?)\s+(?:of|at|from)\s+(.+?)(?:\.|,|$)/gi,
    extract: (m) => ({ person: m[1], title: m[2], company: m[3] }),
  },
];

export function extractMovesFromText(
  title: string,
  summary: string,
  source: string,
  url: string,
  knownNames: ReadonlySet<string> = new Set(),
): ExtractedMove[] {
  const moves: ExtractedMove[] = [];
  // Scan the title and the summary as SEPARATE texts, title first. Headlines
  // are the cleanest signal; concatenating them let messy summary prose
  // shadow a perfectly extractable headline (see MOVE_PATTERNS note).
  const texts = [title, summary].filter(Boolean);
  const text = texts.join(' ');

  // Defense in depth: even when called directly (e.g. in tests) without the
  // article-level isEligibleExecMoveArticle() pre-filter, require at least
  // one exec keyword somewhere in the text.
  const hasKeyword = EXEC_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  if (!hasKeyword) return moves;

  // Determine move type
  let moveType = 'hired';
  if (/step.*down|resign|depart|retir/i.test(text)) moveType = 'departed';
  else if (/promot/i.test(text)) moveType = 'promoted';
  else if (/appoint|named/i.test(text)) moveType = 'appointed';
  else if (/board.*director/i.test(text)) moveType = 'board_joined';

  const seenPeople = new Set<string>();
  for (const scanText of texts) {
    for (const patternDef of MOVE_PATTERNS) {
      for (const match of Array.from(scanText.matchAll(patternDef.regex))) {
        const { person, title: titleGroup, company: companyGroup } = patternDef.extract(match);
        const personName = person?.trim();
        const titleVal = titleGroup?.trim();
        const companyVal = companyGroup?.trim();

        if (!isLikelyPersonName(personName)) continue;
        if (!isLikelyTitle(titleVal)) continue;
        if (!isLikelyOrg(companyVal)) continue;
        // One move per person per article — the title and summary usually
        // describe the same appointment.
        const personKey = personName!.toLowerCase();
        if (seenPeople.has(personKey)) continue;
        seenPeople.add(personKey);

        const verified = isKnownOrgName(companyVal, knownNames);

        moves.push({
          personName: personName!,
          toTitle: moveType !== 'departed' ? titleVal! : null,
          toCompany: moveType !== 'departed' ? companyVal! : null,
          fromTitle: moveType === 'departed' ? titleVal! : null,
          fromCompany: moveType === 'departed' ? companyVal! : null,
          moveType,
          source,
          sourceUrl: url,
          summary: title.slice(0, 500),
          verified,
        });
      }
    }
  }

  return moves;
}

/**
 * Scan recent news articles for executive moves and store in DB.
 * Runs daily via cron scheduler.
 */
export async function fetchAndStoreExecutiveMoves(): Promise<{ found: number; stored: number }> {
  try {
    // Get news articles from last 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const articles = await prisma.newsArticle.findMany({
      where: { publishedAt: { gte: threeDaysAgo } },
      select: { title: true, summary: true, source: true, url: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 200,
    });

    const knownNames = await loadKnownCompanyNames();

    let found = 0;
    let stored = 0;

    for (const article of articles) {
      if (!isEligibleExecMoveArticle(article.title)) continue;

      const moves = extractMovesFromText(
        article.title,
        article.summary || '',
        article.source || 'Unknown',
        article.url,
        knownNames,
      );

      for (const move of moves) {
        found++;
        // Check for duplicates (same person + same date range)
        const existing = await prisma.executiveMove.findFirst({
          where: {
            personName: move.personName,
            date: { gte: new Date(article.publishedAt.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          await prisma.executiveMove.create({
            data: {
              personName: move.personName,
              toTitle: move.toTitle,
              toCompany: move.toCompany,
              fromTitle: move.fromTitle,
              fromCompany: move.fromCompany,
              moveType: move.moveType,
              date: article.publishedAt,
              source: move.source,
              sourceUrl: move.sourceUrl,
              summary: move.summary,
              verified: move.verified,
            },
          });
          stored++;
        }
      }
    }

    logger.info('Executive moves scan complete', { articlesScanned: articles.length, found, stored });
    return { found, stored };
  } catch (err) {
    logger.error('Executive moves fetch error', { error: String(err) });
    return { found: 0, stored: 0 };
  }
}
