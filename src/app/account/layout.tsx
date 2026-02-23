import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Settings',
  description: 'Manage your SpaceNexus account settings, preferences, and security options.',
  alternates: { canonical: 'https://spacenexus.us/account' },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
