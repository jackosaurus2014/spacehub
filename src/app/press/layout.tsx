import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Press & Media | SpaceNexus',
  description: 'SpaceNexus press releases, media coverage, and brand resources for journalists and media professionals.',
  openGraph: {
    title: 'Press & Media | SpaceNexus',
    description: 'SpaceNexus press releases, media coverage, and brand resources for journalists and media professionals.',
  },
};

export default function PressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
