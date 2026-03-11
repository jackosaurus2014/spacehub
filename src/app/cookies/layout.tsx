import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Learn about how SpaceNexus uses cookies and similar technologies to improve your experience.',
  openGraph: {
    title: 'Cookie Policy | SpaceNexus',
    description: 'Learn about how SpaceNexus uses cookies and similar technologies to improve your experience.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Cookie Policy | SpaceNexus',
    description: 'Learn about how SpaceNexus uses cookies and similar technologies to improve your experience.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/cookies',
  },
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
