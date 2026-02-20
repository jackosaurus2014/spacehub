import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Investor Directory',
  description: 'Comprehensive profiles of VCs, PE firms, corporate venture capital arms, and government funds actively investing in the space industry. Find the right investors for your space startup.',
  keywords: ['space investors', 'space VC firms', 'space venture capital', 'space investment funds', 'space angel investors'],
  openGraph: {
    title: 'SpaceNexus - Space Industry Investor Directory',
    description: 'Comprehensive profiles of VCs, PE firms, corporate venture capital arms, and government funds actively investing in the space industry. Find the right investors for your space startup.',
    url: 'https://spacenexus.us/investors',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Industry Investor Directory',
    description: 'Comprehensive profiles of VCs, PE firms, corporate venture capital arms, and government funds actively investing in the space industry. Find the right investors for your space startup.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/investors',
  },
};

export default function InvestorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
