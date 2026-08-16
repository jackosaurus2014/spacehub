import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await prisma.companyProfile.findUnique({
    where: { slug },
    select: { name: true, description: true, logoUrl: true, sector: true, headquarters: true },
  });

  // The page itself is a Client Component that fetches its data after
  // mount, so it can never produce a real 404 status on its own — the
  // existence check has to happen here, in generateMetadata, which runs
  // server-side before the response streams. Calling notFound() here makes
  // the route render src/app/company-profiles/[slug]/not-found.tsx with a
  // genuine HTTP 404 status.
  if (!company) notFound();

  const desc = company.description?.slice(0, 160) || `${company.name} - space industry company profile on SpaceNexus`;

  return {
    title: `${company.name} - Space Company Profile`,
    description: desc,
    openGraph: {
      title: `${company.name} | SpaceNexus`,
      description: desc,
      url: `https://spacenexus.us/company-profiles/${slug}`,
      images: company.logoUrl
        ? [{ url: company.logoUrl, width: 200, height: 200, alt: company.name }]
        : [{ url: '/og-companies.png', width: 1200, height: 630, alt: company.name }],
    },
    twitter: { card: 'summary', title: company.name, description: desc },
    alternates: { canonical: `https://spacenexus.us/company-profiles/${slug}` },
  };
}

export default function CompanyProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
