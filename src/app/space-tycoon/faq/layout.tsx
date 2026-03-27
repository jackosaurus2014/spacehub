import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Tycoon FAQ',
  description: 'Frequently asked questions about Space Tycoon, the free space industry idle game on SpaceNexus.',
  alternates: {
    canonical: 'https://spacenexus.us/space-tycoon/faq',
  },
};

export default function SpaceTycoonFAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
