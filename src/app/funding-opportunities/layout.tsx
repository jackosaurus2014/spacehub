import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Grants & Funding Opportunities',
  description: 'Aggregating SBIR, STTR, NASA, DARPA, and ESA grants alongside state incentives for space entrepreneurs. Discover government and institutional funding programs for the space industry.',
  keywords: ['space grants', 'SBIR space', 'NASA funding', 'space startup grants', 'STTR', 'DARPA space', 'government grants space industry'],
  openGraph: {
    title: 'SpaceNexus - Space Grants & Funding Opportunities',
    description: 'Aggregating SBIR, STTR, NASA, DARPA, and ESA grants alongside state incentives for space entrepreneurs. Discover government and institutional funding programs for the space industry.',
    url: 'https://spacenexus.us/funding-opportunities',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Grants & Funding Opportunities',
    description: 'Aggregating SBIR, STTR, NASA, DARPA, and ESA grants alongside state incentives for space entrepreneurs. Discover government and institutional funding programs for the space industry.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/funding-opportunities',
  },
};

export default function FundingOpportunitiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
