import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your email address to complete your SpaceNexus account registration.',
  openGraph: {
    title: 'Verify Email | SpaceNexus',
    description: 'Verify your email address to complete your SpaceNexus account registration.',
  },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
