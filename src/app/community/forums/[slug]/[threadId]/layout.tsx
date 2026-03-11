import type { Metadata } from 'next';
import prisma from '@/lib/db';

type Props = {
  params: Promise<{ slug: string; threadId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, threadId } = await params;
  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    select: {
      title: true,
      content: true,
      category: { select: { name: true } },
    },
  });

  if (!thread) return { title: 'Thread Not Found' };

  const desc =
    thread.content.slice(0, 160).replace(/\n/g, ' ') ||
    `Discussion thread in ${thread.category.name} on SpaceNexus`;

  return {
    title: `${thread.title} - Community Discussion`,
    description: desc,
    openGraph: {
      title: `${thread.title} | SpaceNexus Community`,
      description: desc,
      url: `https://spacenexus.us/community/forums/${slug}/${threadId}`,
    },
    twitter: { card: 'summary', title: thread.title, description: desc },
    alternates: {
      canonical: `https://spacenexus.us/community/forums/${slug}/${threadId}`,
    },
  };
}

export default function ForumThreadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
