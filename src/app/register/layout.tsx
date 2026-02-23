import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a free SpaceNexus account to access space industry intelligence, real-time data, market analysis, and professional networking tools.',
  alternates: { canonical: 'https://spacenexus.us/register' },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
