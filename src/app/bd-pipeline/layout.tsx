import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BD Opportunity Pipeline',
  description: 'Track business development opportunities from discovery through award. Manage your BD pipeline, log interactions, and monitor win rates across government and commercial contracts.',
  keywords: [
    'BD pipeline',
    'business development',
    'space contracts',
    'opportunity tracker',
    'capture management',
    'proposal tracking',
    'win rate',
  ],
  openGraph: {
    title: 'BD Opportunity Pipeline | SpaceNexus',
    description: 'Track business development opportunities from discovery through award. Manage your BD pipeline, log interactions, and monitor win rates across government and commercial contracts.',
    url: 'https://spacenexus.us/bd-pipeline',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BD Opportunity Pipeline | SpaceNexus',
    description: 'Track business development opportunities from discovery through award. Manage your BD pipeline, log interactions, and monitor win rates.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/bd-pipeline',
  },
};

export default function BDPipelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
