import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Regulatory Compliance Hub',
  description: 'Navigate space industry regulations with FCC filings, ITU spectrum allocations, space law treaties, and FAA licensing. Stay compliant with evolving aerospace rules.',
  keywords: [
    'space regulation',
    'FCC space filings',
    'space law',
    'FAA launch license',
    'ITU spectrum',
    'aerospace compliance',
    'space policy',
  ],
  openGraph: {
    title: 'Regulatory Compliance Hub | SpaceNexus',
    description: 'Navigate space industry regulations with FCC filings, ITU spectrum, space law, and FAA licensing.',
    url: 'https://spacenexus.us/compliance',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Regulatory Compliance Hub | SpaceNexus',
    description: 'Navigate space industry regulations with FCC filings, ITU spectrum, space law, and FAA licensing.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/compliance',
  },
};

export default function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
