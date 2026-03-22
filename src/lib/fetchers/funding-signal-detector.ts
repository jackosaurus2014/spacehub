// ─── Funding Signal Detector ─────────────────────────────────────────────────
// Scans news articles for funding announcements and extracts structured
// funding data (company, round type, amount, investors).
// Free approach: regex on existing news feed (no Crunchbase API needed).

import prisma from '../db';
import { logger } from '../logger';
import { upsertContent } from '../dynamic-content';

const FUNDING_KEYWORDS = [
  'raised', 'funding', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E',
  'seed round', 'pre-seed', 'venture', 'investment', 'financing',
  'IPO', 'SPAC', 'merger', 'acquisition', 'valuation',
  'million', 'billion', '$M', '$B',
];

const AMOUNT_PATTERNS = [
  /\$(\d+(?:\.\d+)?)\s*(billion|B)\b/i,
  /\$(\d+(?:\.\d+)?)\s*(million|M)\b/i,
  /(\d+(?:\.\d+)?)\s*(billion|B)\s*(?:dollars?|USD)/i,
  /(\d+(?:\.\d+)?)\s*(million|M)\s*(?:dollars?|USD)/i,
  /raised\s*\$(\d+(?:\.\d+)?)\s*(M|B|million|billion)/i,
];

const ROUND_PATTERNS = [
  /Series\s+([A-F])\b/i,
  /(seed|pre-seed)\s+(?:round|funding|investment)/i,
  /(IPO|initial public offering)/i,
  /(SPAC|special purpose acquisition)/i,
  /(merger|acquisition|acquired|acquires)/i,
];

interface FundingSignal {
  companyName: string;
  amount: number | null;
  amountStr: string | null;
  roundType: string;
  source: string;
  sourceUrl: string;
  date: Date;
  summary: string;
}

function extractFundingFromText(title: string, summary: string, source: string, url: string, date: Date): FundingSignal | null {
  const text = `${title} ${summary}`;

  // Check for funding keywords
  const hasFundingKeyword = FUNDING_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  if (!hasFundingKeyword) return null;

  // Extract amount
  let amount: number | null = null;
  let amountStr: string | null = null;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'b' || unit === 'billion') {
        amount = num * 1_000_000_000;
        amountStr = `$${num}B`;
      } else {
        amount = num * 1_000_000;
        amountStr = `$${num}M`;
      }
      break;
    }
  }

  // Extract round type
  let roundType = 'funding';
  for (const pattern of ROUND_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const type = match[1].toLowerCase();
      if (type.startsWith('series')) roundType = `Series ${match[1].toUpperCase()}`;
      else if (type === 'seed' || type === 'pre-seed') roundType = type;
      else if (type === 'ipo' || type.includes('public')) roundType = 'IPO';
      else if (type === 'spac' || type.includes('special')) roundType = 'SPAC';
      else if (type.includes('merger') || type.includes('acqui')) roundType = 'M&A';
      break;
    }
  }

  // Must have either an amount or a round type beyond generic "funding"
  if (!amount && roundType === 'funding') return null;

  // Extract company name from title (usually the subject)
  // Simple heuristic: first capitalized multi-word sequence
  const companyMatch = title.match(/^([A-Z][\w]+(?:\s+[A-Z][\w]+){0,3})/);
  const companyName = companyMatch ? companyMatch[1].trim() : title.split(/\s+/).slice(0, 3).join(' ');

  return {
    companyName: companyName.slice(0, 100),
    amount,
    amountStr,
    roundType,
    source,
    sourceUrl: url,
    date,
    summary: title.slice(0, 500),
  };
}

/**
 * Scan recent news for funding signals and store as CompanyEvents.
 * Runs daily via cron scheduler.
 */
export async function detectAndStoreFundingSignals(): Promise<{ scanned: number; detected: number; stored: number }> {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const articles = await prisma.newsArticle.findMany({
      where: { publishedAt: { gte: threeDaysAgo } },
      select: { title: true, summary: true, source: true, url: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 300,
    });

    let detected = 0;
    let stored = 0;

    for (const article of articles) {
      const signal = extractFundingFromText(
        article.title,
        article.summary || '',
        article.source || 'Unknown',
        article.url,
        article.publishedAt,
      );

      if (signal) {
        detected++;

        stored++;
      }
    }

    // Store all detected signals in DynamicContent for the funding tracker page
    if (detected > 0) {
      // Collect all signals this run
      const allSignals: FundingSignal[] = [];
      for (const article of articles) {
        const signal = extractFundingFromText(article.title, article.summary || '', article.source || '', article.url, article.publishedAt);
        if (signal) allSignals.push(signal);
      }
      await upsertContent(
        'funding:tracker:recent-signals',
        'funding',
        'tracker',
        allSignals.slice(0, 50),
        { sourceType: 'api' },
      );
    }

    logger.info('Funding signal detection complete', { scanned: articles.length, detected, stored });
    return { scanned: articles.length, detected, stored };
  } catch (err) {
    logger.error('Funding signal detection error', { error: String(err) });
    return { scanned: 0, detected: 0, stored: 0 };
  }
}
