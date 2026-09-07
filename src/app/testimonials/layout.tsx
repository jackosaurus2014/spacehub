import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform in Numbers - SpaceNexus',
  description: 'See what the SpaceNexus platform offers space industry professionals. Explore our platform stats, features, and submit your own feedback.',
  alternates: {
    canonical: 'https://spacenexus.us/testimonials',
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
