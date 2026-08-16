import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await prisma.serviceListing.findUnique({
    where: { slug },
    select: { name: true, description: true, category: true, pricingType: true },
  });

  // The listing page itself (page.tsx) is a Client Component: it fetches
  // /api/marketplace/listings/[slug] client-side after mount and only calls
  // notFound() once that fetch fails, which happens entirely in the browser
  // and never reaches the server response. Doing the existence check here
  // instead, in generateMetadata (server-side, before the page streams),
  // renders ./not-found.tsx for the right slugs. Note: middleware.ts also
  // short-circuits unknown slugs on this route with a real HTTP 404 before
  // rendering ever starts — see the comment there for why that's required
  // in addition to this notFound() call.
  if (!listing) notFound();

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
