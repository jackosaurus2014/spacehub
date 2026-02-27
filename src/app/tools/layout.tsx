import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Tools | SpaceNexus',
  description: 'Professional tools for space industry analysis including calculators, comparison tools, and planning resources.',
  openGraph: {
    title: 'Space Industry Tools | SpaceNexus',
    description: 'Professional tools for space industry analysis including calculators, comparison tools, and planning resources.',
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
