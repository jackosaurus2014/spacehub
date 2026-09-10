import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import EmployerPortal from './EmployerPortal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Employer Portal — Manage Your Job Postings',
  description: 'Add, edit, pause, renew and remove your SpaceNexus job postings; see views and apply clicks.',
  robots: { index: false, follow: false },
};

/**
 * Employer portal (2026-09-10). Any account is an employer account the
 * moment it posts a role; there is no separate registration. The page is a
 * thin shell around the client portal so the list can update in place after
 * every action.
 */
export default async function EmployerDashboardPage({ searchParams }: { searchParams: Promise<{ posted?: string; canceled?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=%2Fhire%2Fdashboard');
  const { posted, canceled } = await searchParams;
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <nav className="text-sm text-slate-500 mb-4"><Link href="/hire" className="hover:text-white">Hire</Link> / Employer portal</nav>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Your job postings</h1>
            <p className="text-slate-400 text-sm mt-1">Edit, pause, renew or remove any listing. Views count job-page opens; apply clicks count people who followed your application link.</p>
          </div>
          <Link href="/hire#post-a-job" className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] inline-flex items-center">Post a job</Link>
        </div>
        <EmployerPortal posted={posted} canceled={canceled} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-sm">
          <div className="card p-5">
            <h2 className="text-white font-semibold mb-1">Your company profile</h2>
            <p className="text-slate-400">Postings link to your profile when the company name matches. <Link href="/company-profiles" className="text-cyan-300 hover:underline">Find it and claim it</Link> to add a logo, description and team, and to get the hiring badge.</p>
          </div>
          <div className="card p-5">
            <h2 className="text-white font-semibold mb-1">Receipts, invoices, changes</h2>
            <p className="text-slate-400">Stripe emails a receipt for every payment. For an invoice, a bulk posting arrangement, or anything the portal can&apos;t do, email <a href="mailto:hello@spacenexus.us" className="underline">hello@spacenexus.us</a> with the role title.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
