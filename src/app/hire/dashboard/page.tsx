import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getJobPostingPlan } from '@/lib/job-posting-plans';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Employer Dashboard — Your Job Postings',
  description: 'Your SpaceNexus job postings: status, views, apply clicks, expiry.',
  robots: { index: false, follow: false },
};

/**
 * Employer dashboard (2026-09-10): every posting this account created
 * through /hire, with its plan, status, expiry and the counters the job page
 * and board report. Kept deliberately small — one table, no charts — the
 * numbers employers actually ask for are views and apply clicks.
 */
export default async function EmployerDashboardPage({ searchParams }: { searchParams: Promise<{ posted?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=%2Fhire%2Fdashboard');
  const { posted } = await searchParams;
  const rows = await prisma.spaceJobPosting.findMany({
    where: { postedByUserId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, company: true, location: true, planId: true, isActive: true, paidAt: true, expiresAt: true, featured: true, featuredUntil: true, viewCount: true, applyClicks: true, createdAt: true, stripeSessionId: true },
  });
  const now = Date.now();
  const status = (r: (typeof rows)[number]) => {
    if (!r.paidAt) return { label: 'Awaiting payment', tone: 'text-amber-300' };
    if (r.expiresAt && r.expiresAt.getTime() < now) return { label: 'Expired', tone: 'text-slate-400' };
    if (!r.isActive) return { label: 'Paused', tone: 'text-slate-400' };
    return { label: r.featured && r.featuredUntil && r.featuredUntil.getTime() > now ? 'Live · Featured' : 'Live', tone: 'text-emerald-300' };
  };
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <nav className="text-sm text-slate-500 mb-4"><Link href="/hire" className="hover:text-white">Hire</Link> / Dashboard</nav>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Your job postings</h1>
            <p className="text-slate-400 text-sm mt-1">Views count job-page opens; apply clicks count people who followed your application link.</p>
          </div>
          <Link href="/hire#post-a-job" className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] inline-flex items-center">Post another job</Link>
        </div>

        {posted && rows.some((r) => r.id === posted && r.paidAt) && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200 mb-6">Payment received — your listing is live on the board.</div>
        )}
        {posted && rows.some((r) => r.id === posted && !r.paidAt) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-200 mb-6">Thanks — we&apos;re waiting for Stripe to confirm the payment. This usually takes a few seconds; refresh in a moment.</div>
        )}

        {rows.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-white font-medium">No postings yet</p>
            <p className="text-slate-400 text-sm mt-1">Post a role from the <Link href="/hire#post-a-job" className="text-cyan-300 underline underline-offset-2">Hire page</Link> and it will show up here with its numbers.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-white/[0.06]">
                  <th className="p-3">Role</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Expires</th><th className="p-3 text-right">Views</th><th className="p-3 text-right">Apply clicks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = status(r); const plan = getJobPostingPlan(r.planId);
                  return (
                    <tr key={r.id} className="border-b border-white/[0.04] align-top">
                      <td className="p-3"><Link href={`/space-talent/job/${r.id}`} className="text-white hover:text-cyan-300 font-medium">{r.title}</Link><div className="text-xs text-slate-400">{r.company} · {r.location}</div></td>
                      <td className="p-3 text-slate-300">{plan ? `${plan.name} · $${plan.priceUsd}` : r.planId || '—'}</td>
                      <td className={`p-3 font-medium ${st.tone}`}>{st.label}</td>
                      <td className="p-3 text-slate-300">{fmt(r.expiresAt)}</td>
                      <td className="p-3 text-right text-white tabular-nums">{r.viewCount.toLocaleString()}</td>
                      <td className="p-3 text-right text-white tabular-nums">{r.applyClicks.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500 mt-4">Need a change to a live listing, an invoice, or a refund? Email <a href="mailto:hello@spacenexus.us" className="underline">hello@spacenexus.us</a> with the role title.</p>
      </div>
    </div>
  );
}
