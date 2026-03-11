import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Member Directory',
  description: 'Browse and connect with space industry professionals. Find experts by specialty, location, and experience across the commercial space ecosystem.',
  openGraph: {
    title: 'Member Directory | SpaceNexus',
    description: 'Browse and connect with space industry professionals. Find experts by specialty, location, and experience across the commercial space ecosystem.',
  },
};

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
