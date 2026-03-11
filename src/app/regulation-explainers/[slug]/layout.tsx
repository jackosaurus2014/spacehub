import { Metadata } from 'next';
import prisma from '@/lib/db';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const explainer = await prisma.regulationExplainer.findUnique({
    where: { slug },
    select: { title: true, summary: true, agency: true, category: true },
  });

  if (!explainer) return { title: 'Regulation Explainer Not Found' };

  const desc = explainer.summary?.slice(0, 160) || `${explainer.title} - space regulation explainer on SpaceNexus`;

  return {
    title: `${explainer.title} - Regulation Explainer`,
    description: desc,
    openGraph: {
      title: `${explainer.title} | SpaceNexus`,
      description: desc,
      url: `https://spacenexus.us/regulation-explainers/${slug}`,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: explainer.title }],
    },
    twitter: { card: 'summary', title: explainer.title, description: desc },
    alternates: { canonical: `https://spacenexus.us/regulation-explainers/${slug}` },
  };
}

export default function RegulationExplainerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
