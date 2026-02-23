import { Metadata } from 'next';
import prisma from '@/lib/db';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await (prisma as any).serviceListing.findUnique({
    where: { slug },
    select: { name: true, description: true, category: true, pricingType: true },
  });

  if (!listing) return { title: 'Listing Not Found | SpaceNexus' };

  const desc = listing.description?.slice(0, 160) || `${listing.name} - space industry service listing on SpaceNexus Marketplace`;

  return {
    title: `${listing.name} - SpaceNexus Marketplace`,
    description: desc,
    openGraph: {
      title: `${listing.name} | SpaceNexus Marketplace`,
      description: desc,
      url: `https://spacenexus.us/marketplace/listings/${slug}`,
      images: [{ url: '/og-marketplace.png', width: 1200, height: 630, alt: listing.name }],
    },
    twitter: { card: 'summary', title: listing.name, description: desc },
    alternates: { canonical: `https://spacenexus.us/marketplace/listings/${slug}` },
  };
}

export default function MarketplaceListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
