import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Direct messaging with space industry professionals on SpaceNexus.',
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
