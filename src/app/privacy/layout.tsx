import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how SpaceNexus collects, uses, and protects your personal information. Our commitment to data privacy and security for space industry professionals.',
  openGraph: {
    title: 'Privacy Policy | SpaceNexus',
    description: 'Learn how SpaceNexus collects, uses, and protects your personal information. Our commitment to data privacy and security for space industry professionals.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | SpaceNexus',
    description: 'Learn how SpaceNexus collects, uses, and protects your personal information. Our commitment to data privacy and security for space industry professionals.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/privacy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
