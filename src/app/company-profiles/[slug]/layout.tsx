import { Metadata } from 'next';
import prisma from '@/lib/db';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await (prisma as any).companyProfile.findUnique({
    where: { slug },
    select: { name: true, description: true, logoUrl: true, sector: true, headquarters: true },
  });

  if (!company) return { title: 'Company Not Found | SpaceNexus' };

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
