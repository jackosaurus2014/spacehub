import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Venture Capital & Investors Directory',
  description: 'Explore the leading venture capital firms, corporate investors, and angel networks funding the space economy. Browse 25+ space-focused investors with AUM, portfolio, and thesis data.',
  keywords: [
    'space venture capital',
    'space investors',
    'space VC',
    'aerospace investment',
    'space startups funding',
    'space economy investors',
    'space angel investors',
    'space corporate venture capital',
  ],
  openGraph: {
    title: 'Space Venture Capital & Investors Directory | SpaceNexus',
    description: 'Explore the leading venture capital firms, corporate investors, and angel networks funding the space economy.',
    url: 'https://spacenexus.us/space-investors',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Venture Capital & Investors Directory | SpaceNexus',
    description: 'Explore the leading venture capital firms, corporate investors, and angel networks funding the space economy.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-investors',
  },
};

export default function SpaceInvestorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
