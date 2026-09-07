import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Alternatives — Space Industry Platform Comparison',
  description: 'Compare SpaceNexus with Bloomberg Terminal, Quilty Analytics, Payload Space, and free tools. See why SpaceNexus is the most comprehensive free space intelligence platform.',
  alternates: {
    canonical: 'https://spacenexus.us/vs',
  },
};

export default function VsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
