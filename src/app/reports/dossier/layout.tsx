import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Company Intelligence Dossier - SpaceNexus Reports',
  description:
    'Generate comprehensive AI-powered intelligence dossiers on space industry companies. Deep-dive analysis covering financials, leadership, contracts, competitive positioning, and strategic outlook.',
  openGraph: {
    title: 'Company Intelligence Dossier - SpaceNexus',
    description:
      'AI-powered company intelligence dossiers for the space industry. Financial profiles, leadership analysis, contract history, and strategic outlook.',
    url: 'https://spacenexus.us/reports/dossier',
  },
  alternates: {
    canonical: 'https://spacenexus.us/reports/dossier',
  },
};

export default function DossierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
