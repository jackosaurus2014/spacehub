import type { Metadata } from 'next';
import prisma from '@/lib/db';
import {
  threadRobots,
  threadCanonical,
  threadDescription,
  threadIsIndexable,
} from '@/lib/forum-seo';
import { getAnchorForThread } from '@/lib/forum-anchors';

const BASE_URL = 'https://spacenexus.us';

type Props = {
  params: Promise<{ slug: string; threadId: string }>;
  children: React.ReactNode;
};

/**
 * Thread metadata — where the forum's SEO policy is actually enforced.
 *
 * The site earns its search traffic on dated, fact-checked editorial. A forum
 * is the fastest way to put that at risk: thin unreviewed pages competing
 * with the guides for the same queries. So a thread has to earn indexing.
 *
 * Three rules, all from src/lib/forum-seo.ts so the sitemap applies the same
 * ones:
 *   - Fewer than MIN_INDEXABLE_REPLIES and it is `noindex, follow` — crawlers
 *     still walk through to the launch or company page it anchors, but a stub
 *     never competes in search.
 *   - ONE canonical URL per thread, unconditionally. Replies paginate in
 *     client state rather than in the URL, so a thread has exactly one
 *     address and `?page=2` is the same page as `?page=1`. Canonicalising to
 *     the bare path is what collapses any such query-string variant a crawler
 *     stumbles on — the duplicate-content risk here is query noise, not real
 *     paginated pages. (If reply pages ever become real URLs, switch to
 *     threadCanonical(..., page) and let each page canonicalise to itself.)
 *   - The description comes from the anchor subject when there is one, never
 *     from the opening words of whatever a member typed.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug, threadId } = await props.params;

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    select: {
      title: true,
      content: true,
      isLocked: true,
      category: { select: { name: true } },
      _count: { select: { posts: true } },
    },
  });

  if (!thread) return { title: 'Thread Not Found', robots: { index: false, follow: false } };

  const anchor = await getAnchorForThread(threadId).catch(() => null);
  const postCount = thread._count.posts;

  const indexInput = {
    postCount,
    contentLength: thread.content.length,
    isLocked: thread.isLocked,
    isAnchored: !!anchor,
  };

  const description = threadDescription({
    title: thread.title,
    content: thread.content,
    categoryName: thread.category.name,
    anchorSubtitle: anchor?.subtitle ?? null,
    postCount,
  });

  const canonical = threadCanonical(BASE_URL, slug, threadId, 1);

  return {
    title: `${thread.title} - Community Discussion`,
    description,
    ...threadRobots(indexInput),
    openGraph: {
      title: thread.title,
      description,
      url: canonical,
      type: 'article',
    },
    twitter: { card: 'summary', title: thread.title, description },
    alternates: { canonical },
    other: {
      // A hint for our own auditing, not a directive Google reads. Cheap way
      // to confirm the policy is doing what it says when spot-checking pages.
      'x-forum-indexable': String(threadIsIndexable(indexInput)),
    },
  };
}

export default function ForumThreadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
