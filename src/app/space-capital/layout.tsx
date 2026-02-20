import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Venture Capital & Funding Tracker',
  description: 'Track space industry venture capital, funding rounds, and investor activity. Analyze startup valuations, SPAC performance, and aerospace investment trends.',
  keywords: [
    'space venture capital',
    'space startup funding',
    'space investment',
    'aerospace VC',
    'space SPAC',
    'space funding rounds',
  ],
  openGraph: {
    title: 'Space Venture Capital & Funding Tracker | SpaceNexus',
    description: 'Track space industry venture capital, funding rounds, and investor activity.',
    url: 'https://spacenexus.us/space-capital',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Venture Capital & Funding Tracker | SpaceNexus',
    description: 'Track space industry venture capital, funding rounds, and investor activity.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-capital',
  },
};

export default function SpaceCapitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
