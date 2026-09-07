import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Hub | SpaceNexus',
  description: 'Where the SpaceNexus community gathers today — Space Tycoon corporations, the M/Th Digest, and the feedback line — and what is staged for launch as the community grows.',
  alternates: {
    canonical: 'https://spacenexus.us/community',
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
