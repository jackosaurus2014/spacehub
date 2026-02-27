import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | SpaceNexus',
  description: 'Reset your SpaceNexus account password securely.',
  openGraph: {
    title: 'Reset Password | SpaceNexus',
    description: 'Reset your SpaceNexus account password securely.',
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
