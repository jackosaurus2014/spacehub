import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how SpaceNexus collects, uses, and protects your personal information.',
  openGraph: {
    title: 'Privacy Policy | SpaceNexus',
    description: 'Learn how SpaceNexus collects, uses, and protects your personal information.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | SpaceNexus',
    description: 'Learn how SpaceNexus collects, uses, and protects your personal information.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/privacy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
