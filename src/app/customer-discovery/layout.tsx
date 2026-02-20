import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Customer Discovery Database',
  description: 'Find potential customers across government agencies, prime contractors, commercial space operators, and end-user industries. Navigate the space industry buyer landscape with detailed procurement profiles.',
  keywords: ['space customer discovery', 'NASA procurement', 'space force contracts', 'space industry customers', 'satellite buyers'],
  openGraph: {
    title: 'SpaceNexus - Space Customer Discovery Database',
    description: 'Find potential customers across government agencies, prime contractors, commercial space operators, and end-user industries. Navigate the space industry buyer landscape with detailed procurement profiles.',
    url: 'https://spacenexus.us/customer-discovery',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Customer Discovery Database',
    description: 'Find potential customers across government agencies, prime contractors, commercial space operators, and end-user industries. Navigate the space industry buyer landscape with detailed procurement profiles.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/customer-discovery',
  },
};

export default function CustomerDiscoveryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
