import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform in Numbers',
  description: 'SpaceNexus by the numbers — platform stats, data sources, and feature highlights for space industry professionals.',
  alternates: {
    canonical: 'https://spacenexus.us/testimonials',
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
