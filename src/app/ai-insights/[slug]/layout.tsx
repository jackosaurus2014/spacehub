import { Metadata } from 'next';
import prisma from '@/lib/db';
import RelatedRegulatoryActions from '@/components/regulatory/RelatedRegulatoryActions';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const insight = await prisma.aIInsight.findUnique({
    where: { slug },
    select: { title: true, summary: true, category: true },
  });

  if (!insight) return { title: 'AI Insight Not Found' };

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

/**
 * Server layout for AI-insight articles. The page itself is a client
 * component, so the server-rendered "Related regulatory actions" cross-link
 * strip lives here: when the article's text matches regulatory keyword sets,
 * up to 3 recent matching RegulatoryAction entries render below the article.
 * Fail-soft — null render (no layout shift) for non-matching articles, DB
 * errors, or a missing table.
 */
export default async function AIInsightLayout({ children, params }: Props & { children: React.ReactNode }) {
  const { slug } = await params;

  let articleText = '';
  try {
    const insight = await prisma.aIInsight.findUnique({
      where: { slug },
      select: { title: true, summary: true, content: true },
    });
    if (insight) {
      // Title + summary + leading body — enough signal for the keyword
      // matcher without scanning multi-thousand-word articles.
      articleText = `${insight.title} ${insight.summary || ''} ${(insight.content || '').slice(0, 4000)}`;
    }
  } catch {
    // fail soft — article text stays empty, strip renders nothing
  }

  return (
    <>
      {children}
      {articleText && (
        <RelatedRegulatoryActions
          text={articleText}
          wrapperClassName="container mx-auto px-4 pb-10 max-w-3xl"
        />
      )}
    </>
  );
}
