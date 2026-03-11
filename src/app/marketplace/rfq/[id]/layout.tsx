import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Request for Quote Details',
  description: 'View RFQ details, submit proposals, and track matched providers for space industry procurement requests on SpaceNexus Marketplace.',
  openGraph: {
    title: 'Request for Quote Details | SpaceNexus',
    description: 'View RFQ details, submit proposals, and track matched providers for space industry procurement requests.',
  },
};

export default function RFQDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
