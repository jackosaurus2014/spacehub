import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contract Awards Feed | SpaceNexus',
  description: 'Government and commercial space contract awards from NASA, DoD, USSF, ESA, and more.',
  openGraph: {
    title: 'Contract Awards Feed | SpaceNexus',
    description: 'Government and commercial space contract awards from NASA, DoD, USSF, ESA, and more.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
