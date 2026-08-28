import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { APP_URL } from '@/lib/constants';
import GameStyles from '@/components/game/GameStyles';
import GameIcon from '@/components/game/GameIcon';
import ShareButton from '@/components/ui/ShareButton';
import { formatMoney } from '@/lib/game/formulas';
import { getTierDef } from '@/lib/game/corporation-tiers';
import { getPublicCorp, getPublicCorpEquity } from '@/lib/game/public-leaderboard';
import { getReferralStats, inviteUrl } from '@/lib/game/referrals';
import InvitePlayerCard from '@/components/game/InvitePlayerCard';
import { getCorpChronicle } from '@/lib/game/public-era-chronicle';
import { ERA_CHARTER_MAP } from '@/lib/game/corporate-eras';
import { ERA_MEDAL_LABEL } from '@/lib/game/corp-era-registry';
import { ACHIEVEMENTS } from '@/lib/game/achievements';
import { resolveIcon, type IconName } from '@/lib/game/icons';
import { computeServerTradeSummary, DEFAULT_SHARE_WINDOW_DAYS } from '@/lib/game/market-share';

// V1: shape-distinct medal (medal vs medal-outline), color is reinforcement
// — same pattern as CorporateEraPanel.tsx's MEDAL_ICON.
const MEDAL_ICON: Record<string, IconName> = {
  platinum: 'medal', gold: 'medal', silver: 'medal', bronze: 'medal', filed: 'medal-outline',
};

// Public corporation profile — SEO-indexable, no login required. Only
// public-safe scalar fields are ever selected server-side (see
// src/lib/game/public-leaderboard.ts for the exact field list and privacy
// reasoning); no userId, email, or raw game-state JSON is exposed here.
export const revalidate = 300;

const ACHIEVEMENT_LABELS = new Map(ACHIEVEMENTS.map((a) => [a.id, { name: a.name, icon: a.icon }]));

function formatMilestoneLabel(milestoneId: string): string {
  return milestoneId
    .replace(/^milestone_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFoundedDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const corp = await getPublicCorp(params.id);
  if (!corp) return { title: 'Corporation not found | SpaceNexus' };

  const tierDef = getTierDef(corp.tier);
  const description = `${corp.companyName} is ranked #${corp.rank} in Space Tycoon with a net worth of ${formatMoney(corp.netWorth)} — a ${tierDef.name}-tier corporation. See the full profile on SpaceNexus.`;
  const url = `${APP_URL}/space-tycoon/corp/${corp.id}`;

  return {
    title: `${corp.companyName} — Space Tycoon Corporation | SpaceNexus`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${corp.companyName} — Space Tycoon`, description, url, type: 'website' },
    twitter: { card: 'summary_large_image', title: `${corp.companyName} — Space Tycoon`, description },
  };
}

export default async function PublicCorpPage({ params }: { params: { id: string } }) {
  const [corp, chronicle, referrals] = await Promise.all([
    getPublicCorp(params.id),
    getCorpChronicle(params.id),
    getReferralStats(params.id).catch(() => ({ recruited: 0, activeMentees: 0 })),
  ]);
  if (!corp) notFound();

  // Wave E6 (docs/ECONOMY_PVP_2026-08.md §E6): server-verified trade
  // telemetry, computed live from MarketFill — distinct from (and more
  // trustworthy than) the self-reported financials in a published quarterly
  // report; see corp-report-registry.ts's file header on that trust
  // boundary. "Never free, never perfect" per canon — this public view is
  // the free-tier summary (top categories only, no participant table).
  const tradeSummary = await computeServerTradeSummary(corp.id, DEFAULT_SHARE_WINDOW_DAYS);

  // Wave M6 (docs/MEANINGFUL_2026-08.md §M6): public capital structure —
  // float, controller, dividend policy, and the permanent share-transaction
  // chronicle ("corporate scouting is legitimate gameplay"). Null until the
  // corp graduates into the equity market (or pre-migration) — block hidden.
  const equity = await getPublicCorpEquity(corp.id);

  const tierDef = getTierDef(corp.tier);
  const url = `${APP_URL}/space-tycoon/corp/${corp.id}`;

  const stats = [
    { label: 'Net Worth', value: formatMoney(corp.netWorth), accent: 'text-cyan-300' },
    { label: 'Global Rank', value: `#${corp.rank}`, accent: 'text-amber-300' },
    { label: 'Buildings', value: corp.buildingCount.toLocaleString(), accent: 'text-white' },
    { label: 'Research', value: corp.researchCount.toLocaleString(), accent: 'text-white' },
    { label: 'Services', value: corp.serviceCount.toLocaleString(), accent: 'text-white' },
    { label: 'Locations', value: corp.locationsUnlocked.toLocaleString(), accent: 'text-white' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <GameStyles />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <Link href="/space-tycoon/leaderboard" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
          &larr; Leaderboard
        </Link>

        {/* Header card */}
        <div className="hud-frame game-panel-glow p-5 sm:p-6 space-y-4">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="game-heading text-2xl sm:text-3xl font-bold text-white">{corp.companyName}</h1>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] px-2 py-1 rounded-full border font-bold"
                  style={{ color: tierDef.color, borderColor: `${tierDef.color}55`, backgroundColor: `${tierDef.color}14` }}
                >
                  {tierDef.icon} {tierDef.name}
                </span>
                {corp.title && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {corp.title}
                  </span>
                )}
                {corp.allianceTag && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                    [{corp.allianceTag}] {corp.allianceName}
                    {corp.allianceRole ? ` · ${corp.allianceRole}` : ''}
                  </span>
                )}
              </div>
            </div>
            <ShareButton
              title={`${corp.companyName} — Space Tycoon`}
              description={`Ranked #${corp.rank} with a net worth of ${formatMoney(corp.netWorth)}`}
              url={url}
            />
          </div>
          <p className="text-slate-500 text-xs">Founded {formatFoundedDate(corp.foundedAt)}</p>
        </div>

        {/* Stats grid */}
        <div className="hud-frame game-panel p-4 sm:p-5">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="game-label">{s.label}</p>
                <p className={`game-number text-lg font-bold ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <InvitePlayerCard inviteUrl={inviteUrl(corp.id, APP_URL)} companyName={corp.companyName} recruited={referrals.recruited} />

        {/* Market Activity — Wave E6, server-verified from MarketFill (not
            self-reported). Only rendered when the corp has actually traded
            on the shared order book. */}
        {tradeSummary.tradeVolumeValue > 0 && (
          <div className="hud-frame game-panel p-4 sm:p-5">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-center justify-between mb-1">
              <p className="game-label">Market Activity (Server-Verified)</p>
              <span className="text-[10px] text-slate-500">{tradeSummary.windowDays}-day window</span>
            </div>
            <p className="game-number text-lg font-bold text-emerald-300 mb-2">
              {formatMoney(tradeSummary.tradeVolumeValue)} traded
            </p>
            {tradeSummary.topCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tradeSummary.topCategories.map((c) => (
                  <span
                    key={c.category}
                    className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    {c.category} · {c.sharePct.toFixed(1)}% of category volume
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Capital Structure — Wave M6 share registry. Public by canon
            (float and control are scoutable; cash/P&L detail stays behind
            paid diligence). */}
        {equity && (
          <div className="hud-frame game-panel p-4 sm:p-5">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-center justify-between mb-2">
              <p className="game-label">Capital Structure</p>
              {equity.openTenderCount > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/25 font-bold">
                  ⚑ {equity.openTenderCount} open tender {equity.openTenderCount === 1 ? 'offer' : 'offers'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <p className="game-label">Founder Stake</p>
                <p className="game-number text-lg font-bold text-cyan-300">{equity.founderShares}%</p>
              </div>
              <div className="text-center">
                <p className="game-label">Public Float</p>
                <p className="game-number text-lg font-bold text-purple-300">{equity.floatShares}%</p>
              </div>
              <div className="text-center">
                <p className="game-label">Dividend Payout</p>
                <p className="game-number text-lg font-bold text-white">{equity.dividendPayoutPct}%</p>
              </div>
            </div>
            {equity.controllerName && (
              <p className="text-xs text-purple-300 mb-2">
                ◆ Controlled subsidiary of <span className="font-bold">{equity.controllerName}</span>
              </p>
            )}
            {equity.recentTransactions.length > 0 && (
              <div>
                <p className="game-label mb-1.5">Share Chronicle</p>
                <ul className="space-y-1">
                  {equity.recentTransactions.map((t, i) => (
                    <li key={i} className="text-[11px] text-slate-400">
                      <span className="text-slate-500">{new Date(t.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
                      {' — '}
                      {t.kind.replace(/_/g, ' ')}: {t.shares} shares
                      {t.pricePerShare > 0 ? ` at ${formatMoney(t.pricePerShare)}/share` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Achievements */}
        {corp.achievements.length > 0 && (
          <div className="hud-frame game-panel p-4 sm:p-5">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <p className="game-label mb-3">Achievements ({corp.achievements.length})</p>
            <div className="flex flex-wrap gap-2">
              {corp.achievements.map((id) => {
                const label = ACHIEVEMENT_LABELS.get(id);
                return (
                  <span
                    key={id}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-200"
                  >
                    {label ? `${label.icon} ${label.name}` : id}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Global milestones */}
        {corp.globalMilestones.length > 0 && (
          <div className="hud-frame game-panel p-4 sm:p-5">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <p className="game-label mb-3">Global Milestones Claimed ({corp.globalMilestones.length})</p>
            <ul className="space-y-2">
              {corp.globalMilestones.map((m) => (
                <li key={m.milestoneId} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200 inline-flex items-center gap-1.5"><GameIcon name="leaderboard" size={13} /> {formatMilestoneLabel(m.milestoneId)}</span>
                  <span className="text-slate-500 text-xs">
                    {new Date(m.claimedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chronicle — Live-Service Wave LS4: permanent, public, append-only
            record of chartered eras (CLAUDE.md "founding dates, major
            acquisitions, public scandals, and legacy milestones recorded in
            a permanent ledger new players can read as history"). Opt-in —
            only eras the commander explicitly published appear here. */}
        {chronicle.length > 0 && (
          <div className="hud-frame game-panel p-4 sm:p-5">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <p className="game-label mb-3">Corporate Chronicle ({chronicle.length} era{chronicle.length === 1 ? '' : 's'})</p>
            <ul className="space-y-3">
              {chronicle.map((era) => {
                const charter = ERA_CHARTER_MAP.get(era.charterId);
                return (
                  <li key={`${era.eraIndex}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm text-white font-medium flex items-center gap-1.5">
                        <GameIcon name={resolveIcon(charter?.icon, 'governance')} size={12} /> Era {era.eraIndex + 1}: {charter?.name || era.charterId}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold flex items-center gap-1">
                        <GameIcon name={MEDAL_ICON[era.medal] || 'medal'} size={11} /> {ERA_MEDAL_LABEL[era.medal]}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(era.startedAtMs).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      {' – '}
                      {new Date(era.endedAtMs).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      {charter ? ` · ${charter.goalLabel}: ${Math.round(era.goalActual).toLocaleString()} / ${Math.round(era.goalTarget).toLocaleString()}` : ''}
                    </p>
                    {era.notableEvents.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-slate-400 truncate">{era.notableEvents.slice(0, 2).join(' · ')}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="text-center pt-2">
          <Link
            href="/space-tycoon"
            className="game-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
          >
            <GameIcon name="fleet" size={16} /> Build your space empire
          </Link>
          <p className="mt-3 text-slate-600 text-[11px]">
            <Link href="/space-tycoon/leaderboard" className="text-cyan-500 hover:underline">
              See the full leaderboard &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
