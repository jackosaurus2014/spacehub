import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discussion Forums',
  description: 'Join space industry discussions on launch technology, satellite operations, space policy, business development, and more.',
};

export default function ForumsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
