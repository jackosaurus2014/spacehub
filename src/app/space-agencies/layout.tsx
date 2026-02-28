import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Agency Profiles | SpaceNexus',
  description: 'Profiles of 22 space agencies worldwide with budgets, capabilities, and notable missions.',
  openGraph: {
    title: 'Space Agency Profiles | SpaceNexus',
    description: 'Profiles of 22 space agencies worldwide with budgets, capabilities, and notable missions.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Agency Profiles | SpaceNexus',
    description: 'Profiles of 22 space agencies worldwide with budgets, capabilities, and notable missions.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-agencies',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
