import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Tycoon FAQ - How to Play',
  description: 'Learn how to play Space Tycoon. FAQ covering how to make money, build infrastructure, research technologies, and expand across the solar system.',
  alternates: {
    canonical: 'https://spacenexus.us/space-tycoon/faq',
  },
};

export default function SpaceTycoonFAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
