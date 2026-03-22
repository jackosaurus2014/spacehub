// ─── Executive Moves Fetcher ─────────────────────────────────────────────────
// Scans news articles for executive-level personnel changes and extracts
// structured move data (person, title, company, move type).
// Uses keyword matching + pattern extraction from existing news feed.

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

const MOVE_PATTERNS = [
  // "X appointed as CEO of Y"
  /(\w[\w\s.'-]+?)\s+(?:has been\s+)?(?:appointed|named|hired|promoted)\s+(?:as\s+)?(.+?)\s+(?:of|at|for)\s+(.+?)(?:\.|,|$)/i,
  // "X joins Y as CEO"
  /(\w[\w\s.'-]+?)\s+(?:joins|joined|joining)\s+(.+?)\s+as\s+(.+?)(?:\.|,|$)/i,
  // "X steps down as CEO of Y"
  /(\w[\w\s.'-]+?)\s+(?:steps down|stepped down|resigned|departed|retired)\s+(?:as\s+)?(.+?)\s+(?:of|at|from)\s+(.+?)(?:\.|,|$)/i,
];

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
}

function extractMovesFromText(title: string, summary: string, source: string, url: string): ExtractedMove[] {
  const moves: ExtractedMove[] = [];
  const text = `${title} ${summary}`;

  // Check if this article is about executive moves
  const hasKeyword = EXEC_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  if (!hasKeyword) return moves;

  // Determine move type
  let moveType = 'hired';
  if (/step.*down|resign|depart|retir/i.test(text)) moveType = 'departed';
  else if (/promot/i.test(text)) moveType = 'promoted';
  else if (/appoint|named/i.test(text)) moveType = 'appointed';
  else if (/board.*director/i.test(text)) moveType = 'board_joined';

  // Try pattern extraction
  for (const pattern of MOVE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const [, person, titleOrCompany, companyOrTitle] = match;
      if (person && person.length < 50) {
        moves.push({
          personName: person.trim(),
          toTitle: moveType !== 'departed' ? titleOrCompany?.trim() || null : null,
          toCompany: moveType !== 'departed' ? companyOrTitle?.trim() || null : null,
          fromTitle: moveType === 'departed' ? titleOrCompany?.trim() || null : null,
          fromCompany: moveType === 'departed' ? companyOrTitle?.trim() || null : null,
          moveType,
          source,
          sourceUrl: url,
          summary: title.slice(0, 500),
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

    let found = 0;
    let stored = 0;

    for (const article of articles) {
      const moves = extractMovesFromText(
        article.title,
        article.summary || '',
        article.source || 'Unknown',
        article.url,
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
              verified: false,
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
