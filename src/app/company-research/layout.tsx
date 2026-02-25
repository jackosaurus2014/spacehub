import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Company Research AI | SpaceNexus',
  description: 'AI-powered space company research assistant for due diligence and analysis.',
  openGraph: {
    title: 'Company Research AI | SpaceNexus',
    description: 'AI-powered space company research assistant for due diligence and analysis.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
