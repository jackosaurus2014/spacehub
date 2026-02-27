import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | SpaceNexus',
  description: 'Learn how SpaceNexus collects, uses, and protects your personal information.',
  openGraph: {
    title: 'Privacy Policy | SpaceNexus',
    description: 'Learn how SpaceNexus collects, uses, and protects your personal information.',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
