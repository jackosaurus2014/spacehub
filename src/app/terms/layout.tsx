import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the SpaceNexus terms of service governing the use of our space industry intelligence platform.',
  openGraph: {
    title: 'Terms of Service | SpaceNexus',
    description: 'Read the SpaceNexus terms of service governing the use of our space industry intelligence platform.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | SpaceNexus',
    description: 'Read the SpaceNexus terms of service governing the use of our space industry intelligence platform.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/terms',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
