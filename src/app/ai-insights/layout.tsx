import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Intelligence Briefs',
  description: 'AI-generated analysis of space industry trends, company developments, market movements, and regulatory changes.',
};

export default function AIInsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
