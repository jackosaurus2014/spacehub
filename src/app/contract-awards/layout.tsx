import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contract Awards Feed',
  description: 'Government and commercial space contract awards from NASA, DoD, USSF, ESA, and more.',
  openGraph: {
    title: 'Contract Awards Feed | SpaceNexus',
    description: 'Government and commercial space contract awards from NASA, DoD, USSF, ESA, and more.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Contract Awards Feed | SpaceNexus',
    description: 'Government and commercial space contract awards from NASA, DoD, USSF, ESA, and more.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/contract-awards',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
