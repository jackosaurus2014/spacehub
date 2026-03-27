import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Safety',
  description: 'Learn how SpaceNexus protects your data. Our privacy practices, security measures, and data handling policies.',
  alternates: {
    canonical: 'https://spacenexus.us/data-safety',
  },
};

export default function DataSafetyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
