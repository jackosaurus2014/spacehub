import type { Metadata } from 'next';
import prisma from '@/lib/db';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.forumCategory.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });

  if (!category) return { title: 'Forum Not Found | SpaceNexus' };

  const desc =
    category.description?.slice(0, 160) ||
    `${category.name} - community forum discussions on SpaceNexus`;

  return {
    title: `${category.name} - Community Forum | SpaceNexus`,
    description: desc,
    openGraph: {
      title: `${category.name} | SpaceNexus Community`,
      description: desc,
      url: `https://spacenexus.us/community/forums/${slug}`,
    },
    twitter: { card: 'summary', title: category.name, description: desc },
    alternates: { canonical: `https://spacenexus.us/community/forums/${slug}` },
  };
}

export default function ForumCategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
