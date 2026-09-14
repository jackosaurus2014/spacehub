import type { Metadata } from 'next';
import prisma from '@/lib/db';
import { categoryCanonical } from '@/lib/forum-seo';

const BASE_URL = 'https://spacenexus.us';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

/**
 * Category metadata.
 *
 * One canonical per category. Thread paging lives in client state, not the
 * URL, so `?page=2` renders the same document as the bare path — the
 * unconditional canonical is what stops a crawler treating those query-string
 * variants as separate pages. An empty category is `noindex, follow`: there
 * is nothing on it to rank, but the crawler should still reach the forum
 * index and its sibling categories.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;

  const category = await prisma.forumCategory.findUnique({
    where: { slug },
    select: { id: true, name: true, description: true },
  });

  if (!category) return { title: 'Forum Not Found', robots: { index: false, follow: false } };

  const threadCount = await prisma.forumThread.count({ where: { categoryId: category.id } });

  const desc =
    category.description?.slice(0, 160) ||
    `${category.name} — community forum discussions on SpaceNexus`;

  const canonical = categoryCanonical(BASE_URL, slug, 1);

  return {
    title: `${category.name} - Community Forum`,
    description: desc,
    ...(threadCount === 0 ? { robots: { index: false as const, follow: true as const } } : {}),
    openGraph: { title: category.name, description: desc, url: canonical },
    twitter: { card: 'summary', title: category.name, description: desc },
    alternates: { canonical },
  };
}

export default function ForumCategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
