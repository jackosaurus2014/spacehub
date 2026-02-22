import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Hub',
  description: 'Connect with space industry professionals. Browse forums, join discussions, and network with experts across the commercial space ecosystem.',
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
