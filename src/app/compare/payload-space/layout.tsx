import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Payload Space — Space Industry Platform Comparison',
  description: 'Comparing SpaceNexus interactive intelligence platform vs Payload Space newsletter and media. Feature comparison, use cases, and why they complement each other.',
  alternates: {
    canonical: 'https://spacenexus.us/compare/payload-space',
  },
  openGraph: {
    title: 'SpaceNexus vs Payload Space | SpaceNexus',
    description: 'Compare SpaceNexus with Payload Space for space industry news and intelligence. Feature comparison and platform capabilities.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
