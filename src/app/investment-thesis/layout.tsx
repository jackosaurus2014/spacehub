import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Investment Thesis Generator',
  description: 'AI-powered investment analysis that synthesizes funding data, market trends, competitive landscape, and regulatory factors to generate comprehensive space industry investment theses.',
  keywords: ['space investment thesis', 'space company analysis', 'space due diligence', 'AI investment analysis', 'space VC tools'],
  openGraph: {
    title: 'SpaceNexus - AI Investment Thesis Generator',
    description: 'AI-powered investment analysis that synthesizes funding data, market trends, competitive landscape, and regulatory factors to generate comprehensive space industry investment theses.',
    url: 'https://spacenexus.us/investment-thesis',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - AI Investment Thesis Generator',
    description: 'AI-powered investment analysis that synthesizes funding data, market trends, competitive landscape, and regulatory factors to generate comprehensive space industry investment theses.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/investment-thesis',
  },
};

export default function InvestmentThesisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
