import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Startup Funding Tracker',
  description: 'Track venture capital, private equity, and institutional investments in space companies. Real-time monitoring of funding rounds, valuations, and investment trends across the space industry.',
  keywords: ['space startup funding', 'space VC', 'space investment tracker', 'space funding rounds', 'space venture capital'],
  openGraph: {
    title: 'SpaceNexus - Space Startup Funding Tracker',
    description: 'Track venture capital, private equity, and institutional investments in space companies. Real-time monitoring of funding rounds, valuations, and investment trends across the space industry.',
    url: 'https://spacenexus.us/funding-tracker',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Startup Funding Tracker',
    description: 'Track venture capital, private equity, and institutional investments in space companies. Real-time monitoring of funding rounds, valuations, and investment trends across the space industry.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/funding-tracker',
  },
};

export default function FundingTrackerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
