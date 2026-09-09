import prisma from '@/lib/db';
import type { NewsArticle } from '@/types';

/**
 * Live news rail for /guide/space-force-academy (2026-09-09).
 *
 * Same shape as artemis-news.ts: a cheap DB-side `contains` pre-filter over
 * the newest rows, then a precise predicate in-process, returning rows that
 * drop straight into <NewsCard />.
 */
export type SpaceAcademyNewsArticle = Omit<NewsArticle, 'companyTags'>;

export interface SpaceAcademyMatchable {
  title: string;
  summary?: string | null;
}

const ACADEMY_TERM = /\b(space academy|space force academy|united states space academy|u\.s\. space academy)\b/i;
const COMMISSION_TERM = /\bspace academy commission\b|\bcommission on the (united states )?space academy\b/i;
const SERVICE_ACADEMY_TERM = /\bservice academy\b/i;
const SERVICE_ACADEMY_CONTEXT = /\b(space force|nasa|isaacman|guardian|space)\b/i;

/** Does this article belong on the Space Academy guide's news rail? */
export function matchesSpaceAcademyNews(article: SpaceAcademyMatchable): boolean {
  const text = `${article.title} ${article.summary ?? ''}`;
  if (ACADEMY_TERM.test(text)) return true;
  if (COMMISSION_TERM.test(text)) return true;
  if (SERVICE_ACADEMY_TERM.test(text) && SERVICE_ACADEMY_CONTEXT.test(text)) return true;
  return false;
}

const CANDIDATE_TERMS = ['space academy', 'service academy'];

export async function getSpaceAcademyNewsArticles(
  limit = 8,
  candidatePoolSize = 120
): Promise<SpaceAcademyNewsArticle[]> {
  const candidates = await prisma.newsArticle.findMany({
    where: {
      OR: CANDIDATE_TERMS.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' as const } },
        { summary: { contains: term, mode: 'insensitive' as const } },
      ]),
    },
    orderBy: { publishedAt: 'desc' },
    take: candidatePoolSize,
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      url: true,
      source: true,
      category: true,
      imageUrl: true,
      publishedAt: true,
      fetchedAt: true,
    },
  });
  return candidates.filter(matchesSpaceAcademyNews).slice(0, limit);
}
