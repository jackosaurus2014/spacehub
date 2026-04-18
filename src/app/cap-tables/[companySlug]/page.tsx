import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  checkCapTableAccess,
  serializeCapTable,
  bigintToString,
} from '@/lib/cap-table-utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companySlug } = await params;
  const company = await prisma.companyProfile.findUnique({
    where: { slug: companySlug },
    select: { name: true },
  });
  if (!company) return { title: 'Cap Table — SpaceNexus' };
  return {
    title: `${company.name} Cap Table — SpaceNexus`,
    description: `Ownership and capitalization details for ${company.name}.`,
  };
}

const HOLDER_TYPE_COLORS: Record<string, string> = {
  founder: 'bg-emerald-500',
  employee: 'bg-blue-500',
  investor: 'bg-purple-500',
  other: 'bg-amber-500',
};

const HOLDER_TYPE_LABELS: Record<string, string> = {
  founder: 'Founders',
  employee: 'Employees',
  investor: 'Investors',
  other: 'Other',
};

function formatCurrency(amount: number | null | undefined, currency: string | null) {
  if (amount === null || amount === undefined) return '—';
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

function formatNumber(s: string | null) {
  if (!s) return '—';
  try {
    return BigInt(s).toLocaleString();
  } catch {
    return s;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function ShareClassLabel(c: string) {
  return c
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export default async function CapTablePage({ params }: PageProps) {
  const { companySlug } = await params;

  const company = await prisma.companyProfile.findUnique({
    where: { slug: companySlug },
    select: { id: true, slug: true, name: true, claimedByUserId: true, logoUrl: true },
  });
  if (!company) notFound();

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const isAdmin = Boolean(session?.user?.isAdmin);
  const isOwner = Boolean(userId && company.claimedByUserId === userId);

  const capTable = await prisma.capTable.findUnique({
    where: { companyId: company.id },
    include: { entries: { orderBy: { createdAt: 'asc' } } },
  });

  if (!capTable) {
    return (
      <div className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
          <div className="text-5xl">📊</div>
          <h1 className="text-2xl font-bold text-white">No Cap Table Published</h1>
          <p className="text-sm text-slate-400">
            {company.name} has not published a cap table yet.
          </p>
          {isOwner ? (
            <Link
              href="/provider-dashboard?tab=cap-table"
              className="inline-block mt-4 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
            >
              Add a Cap Table
            </Link>
          ) : (
            <Link
              href={`/company-profiles/${company.slug}`}
              className="inline-block mt-4 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              ← Back to Profile
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Visibility enforcement at the page level (matches API behaviour).
  let hasShare = false;
  if (
    userId &&
    capTable.visibility === 'invite_only' &&
    !isOwner &&
    !isAdmin
  ) {
    try {
      const share = await prisma.capTableShare.findUnique({
        where: {
          capTableId_grantedToUserId: {
            capTableId: capTable.id,
            grantedToUserId: userId,
          },
        },
        select: { expiresAt: true },
      });
      if (share && (!share.expiresAt || share.expiresAt > new Date())) {
        hasShare = true;
      }
    } catch (err) {
      logger.warn('Cap table share lookup failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const access = checkCapTableAccess({
    visibility: capTable.visibility,
    isOwner,
    isAdmin,
    isAuthenticated: Boolean(userId),
    hasShare,
  });

  if (!access.allowed) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-bold text-white">Cap Table Restricted</h1>
          <p className="text-sm text-slate-400">{access.reason}</p>
          <p className="text-xs text-slate-500">
            Visibility: <span className="font-mono">{capTable.visibility}</span>
          </p>
          {!userId ? (
            <Link
              href={`/login?returnTo=/cap-tables/${company.slug}`}
              className="inline-block mt-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
            >
              Sign In →
            </Link>
          ) : (
            <Link
              href={`/company-profiles/${company.slug}`}
              className="inline-block mt-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              ← Back to Profile
            </Link>
          )}
        </div>
      </div>
    );
  }

  const serialized = serializeCapTable(capTable, capTable.entries);

  // Aggregate ownership by holderType for the pie/bar chart.
  const totalsByType: Record<string, number> = {};
  let totalRaised = 0;
  let totalPercentage = 0;
  for (const e of capTable.entries) {
    const pct = e.percentage ?? 0;
    totalsByType[e.holderType] = (totalsByType[e.holderType] ?? 0) + pct;
    totalPercentage += pct;
    if (e.investmentAmount) totalRaised += e.investmentAmount;
  }

  // Normalise totals so the bars always fill the chart, even if percentages
  // don't sum to exactly 100 in the data.
  const chartTotal = Math.max(totalPercentage, 0.0001);
  const chartSegments = Object.entries(totalsByType)
    .map(([type, pct]) => ({
      type,
      pct,
      width: (pct / chartTotal) * 100,
      color: HOLDER_TYPE_COLORS[type] ?? 'bg-slate-500',
      label: HOLDER_TYPE_LABELS[type] ?? type,
    }))
    .sort((a, b) => b.pct - a.pct);

  const sharesOutstandingStr = bigintToString(capTable.sharesOutstanding);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link
              href={`/company-profiles/${company.slug}`}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              ← {company.name}
            </Link>
            <h1 className="text-3xl font-bold text-white mt-1">Cap Table</h1>
            <p className="text-sm text-slate-400 mt-1">
              Ownership and capitalization for {company.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-white/[0.08] rounded text-slate-300 capitalize">
              {capTable.visibility.replace(/_/g, ' ')}
            </span>
            {(isOwner || isAdmin) && (
              <Link
                href="/provider-dashboard?tab=cap-table"
                className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs rounded-lg transition-colors"
              >
                Manage
              </Link>
            )}
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Valuation</div>
            <div className="text-xl font-bold text-white mt-1">
              {formatCurrency(capTable.currentValuation, capTable.currency)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Total Raised</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {totalRaised > 0 ? formatCurrency(totalRaised, capTable.currency) : '—'}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Shareholders</div>
            <div className="text-xl font-bold text-white mt-1">{capTable.entries.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">As of</div>
            <div className="text-xl font-bold text-white mt-1">
              {formatDate(serialized.asOfDate)}
            </div>
          </div>
        </div>

        {/* Pie / bar chart */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Ownership by Holder Type</h2>
          {chartSegments.length === 0 ? (
            <p className="text-xs text-slate-500">
              Add entries to see the ownership breakdown.
            </p>
          ) : (
            <>
              <div className="flex w-full h-6 rounded-lg overflow-hidden bg-white/[0.06]">
                {chartSegments.map((seg) => (
                  <div
                    key={seg.type}
                    className={seg.color}
                    style={{ width: `${seg.width}%` }}
                    title={`${seg.label}: ${seg.pct.toFixed(2)}%`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {chartSegments.map((seg) => (
                  <div key={seg.type} className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 rounded-sm ${seg.color}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{seg.label}</div>
                      <div className="text-xs text-slate-400">{seg.pct.toFixed(2)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Authorized / outstanding */}
        {(capTable.sharesAuthorized != null || capTable.sharesOutstanding != null) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide">
                Shares Authorized
              </div>
              <div className="text-lg font-mono text-white mt-1">
                {formatNumber(bigintToString(capTable.sharesAuthorized))}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide">
                Shares Outstanding
              </div>
              <div className="text-lg font-mono text-white mt-1">
                {formatNumber(sharesOutstandingStr)}
              </div>
            </div>
          </div>
        )}

        {/* Entries table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-semibold text-white">Entries</h2>
          </div>
          {capTable.entries.length === 0 ? (
            <p className="text-sm text-slate-400 px-5 py-8 text-center">No entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-left text-xs text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Holder</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3 text-right">Shares</th>
                    <th className="px-4 py-3 text-right">%</th>
                    <th className="px-4 py-3 text-right">Investment</th>
                    <th className="px-4 py-3">Round</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {serialized.entries.map((e) => (
                    <tr key={e.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-white font-medium">{e.holderName}</td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{e.holderType}</td>
                      <td className="px-4 py-3 text-slate-300">{ShareClassLabel(e.shareClass)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {formatNumber(e.shareCount)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {e.percentage !== null && e.percentage !== undefined
                          ? `${e.percentage.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {formatCurrency(e.investmentAmount, capTable.currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {e.roundLabel ? e.roundLabel.replace(/_/g, ' ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document link + notes */}
        {(capTable.documentUrl || capTable.notes) && (
          <div className="card p-5 space-y-3">
            {capTable.documentUrl && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                  Source Document
                </div>
                <a
                  href={capTable.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline break-all"
                >
                  {capTable.documentUrl}
                </a>
              </div>
            )}
            {capTable.notes && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{capTable.notes}</p>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 text-center">
          Self-reported by {company.name}. SpaceNexus does not verify cap table data.
        </p>
      </div>
    </div>
  );
}
