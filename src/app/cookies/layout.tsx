import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | SpaceNexus',
  description: 'Learn about how SpaceNexus uses cookies and similar technologies to improve your experience.',
  openGraph: {
    title: 'Cookie Policy | SpaceNexus',
    description: 'Learn about how SpaceNexus uses cookies and similar technologies to improve your experience.',
  },
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
