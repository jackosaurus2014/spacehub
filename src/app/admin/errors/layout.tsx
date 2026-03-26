import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Error Monitor | Admin',
  description: 'Monitor and analyze production errors across SpaceNexus. View error trends, top error messages, and recent error details.',
  openGraph: {
    title: 'Error Monitor | SpaceNexus Admin',
    description: 'Monitor and analyze production errors across SpaceNexus. View error trends, top error messages, and recent error details.',
  },
};

export default function ErrorMonitorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
