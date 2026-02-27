import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Content Moderation | SpaceNexus',
  description: 'Review and moderate user-generated content, manage reports, and enforce community guidelines across the SpaceNexus platform.',
  openGraph: {
    title: 'Content Moderation | SpaceNexus',
    description: 'Review and moderate user-generated content, manage reports, and enforce community guidelines across the SpaceNexus platform.',
  },
};

export default function ModerationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
