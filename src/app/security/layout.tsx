import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security & Trust',
  description: 'Learn how SpaceNexus protects your data with enterprise-grade security, encryption, access controls, and compliance with industry standards.',
  openGraph: {
    title: 'Security & Trust | SpaceNexus',
    description: 'Enterprise-grade security for space industry intelligence. SOC 2, encryption, GDPR/CCPA compliance.',
    url: 'https://spacenexus.us/security',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Security & Trust | SpaceNexus',
    description: 'Enterprise-grade security for space industry intelligence.',
  },
  alternates: { canonical: 'https://spacenexus.us/security' },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
