import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Learn about how SpaceNexus uses cookies and similar tracking technologies, including what types of cookies we use and how to manage your preferences.',
  openGraph: {
    title: 'Cookie Policy | SpaceNexus',
    description: 'Learn about how SpaceNexus uses cookies and similar tracking technologies, including what types of cookies we use and how to manage your preferences.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Cookie Policy | SpaceNexus',
    description: 'Learn about how SpaceNexus uses cookies and similar tracking technologies, including what types of cookies we use and how to manage your preferences.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/cookies',
  },
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
