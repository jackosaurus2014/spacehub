import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Press & Media',
  description: 'SpaceNexus press releases, media coverage, and brand resources for journalists and media professionals.',
  openGraph: {
    title: 'Press & Media | SpaceNexus',
    description: 'SpaceNexus press releases, media coverage, and brand resources for journalists and media professionals.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Press & Media | SpaceNexus',
    description: 'SpaceNexus press releases, media coverage, and brand resources for journalists and media professionals.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/press',
  },
};

export default function PressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
