import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your SpaceNexus account password. Enter your email address and we will send you a link to create a new password.',
  alternates: { canonical: 'https://spacenexus.us/forgot-password' },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
