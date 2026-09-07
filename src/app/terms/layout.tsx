import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the SpaceNexus Terms of Service governing your use of our space industry intelligence platform, data services, and community features.',
  openGraph: {
    title: 'Terms of Service | SpaceNexus',
    description: 'Read the SpaceNexus Terms of Service governing your use of our space industry intelligence platform, data services, and community features.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | SpaceNexus',
    description: 'Read the SpaceNexus Terms of Service governing your use of our space industry intelligence platform, data services, and community features.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/terms',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
