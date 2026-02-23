import { Metadata } from 'next';
import prisma from '@/lib/db';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const insight = await (prisma as any).aIInsight.findUnique({
    where: { slug },
    select: { title: true, summary: true, category: true },
  });

  if (!insight) return { title: 'AI Insight Not Found | SpaceNexus' };

  const desc = insight.summary?.slice(0, 160) || `${insight.title} - AI-generated space industry insight on SpaceNexus`;

  return {
    title: `${insight.title} - AI Insight`,
    description: desc,
    openGraph: {
      title: `${insight.title} | SpaceNexus`,
      description: desc,
      url: `https://spacenexus.us/ai-insights/${slug}`,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: insight.title }],
    },
    twitter: { card: 'summary', title: insight.title, description: desc },
    alternates: { canonical: `https://spacenexus.us/ai-insights/${slug}` },
  };
}

export default function AIInsightLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
