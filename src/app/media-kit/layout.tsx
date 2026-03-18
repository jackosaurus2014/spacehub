import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Media Kit',
  description: 'SpaceNexus media kit with brand assets, logos, colors, company information, key statistics, and boilerplate descriptions for press and media coverage.',
  openGraph: {
    title: 'Media Kit | SpaceNexus',
    description: 'SpaceNexus media kit with brand assets, logos, colors, company information, key statistics, and boilerplate descriptions for press and media coverage.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Media Kit | SpaceNexus',
    description: 'SpaceNexus media kit with brand assets, logos, colors, company information, key statistics, and boilerplate descriptions for press and media coverage.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/media-kit',
  },
};

export default function MediaKitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
