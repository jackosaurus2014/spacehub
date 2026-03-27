import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Testimonials',
  description: 'What space professionals say about SpaceNexus. User feedback and platform reviews.',
  alternates: {
    canonical: 'https://spacenexus.us/testimonials',
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
