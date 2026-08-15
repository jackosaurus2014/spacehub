import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contracts & Opportunities Hub',
  description: 'The unified hub for space industry contracts and opportunities: SAM.gov federal solicitations, curated contract awards, grants, SBIR/STTR, market signals, agency budgets, and congressional activity. Track NASA, Space Force, DARPA, and ESA.',
  keywords: [
    'SAM.gov space',
    'space contracts',
    'SBIR space',
    'space grants',
    'NASA procurement',
    'Space Force contracts',
    'federal space',
    'space business opportunities',
  ],
  openGraph: {
    title: 'Contracts & Opportunities Hub | SpaceNexus',
    description: 'The unified hub for space industry contracts and opportunities: SAM.gov solicitations, contract awards, grants, SBIR/STTR, market signals, agency budgets, and congressional activity.',
    url: 'https://spacenexus.us/procurement',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contracts & Opportunities Hub | SpaceNexus',
    description: 'The unified hub for space industry contracts and opportunities: SAM.gov solicitations, contract awards, grants, SBIR/STTR, market signals, agency budgets, and congressional activity.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/procurement',
  },
};

export default function ProcurementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
