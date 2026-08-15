import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { APP_URL } from '@/lib/constants';
import GameStyles from '@/components/game/GameStyles';
import ShareButton from '@/components/ui/ShareButton';
import { formatMoney } from '@/lib/game/formulas';
import { getTierDef } from '@/lib/game/corporation-tiers';
import { getPublicCorp } from '@/lib/game/public-leaderboard';
import { getCorpChronicle } from '@/lib/game/public-era-chronicle';
import { ERA_CHARTER_MAP } from '@/lib/game/corporate-eras';
import { ERA_MEDAL_LABEL, ERA_MEDAL_ICON } from '@/lib/game/corp-era-registry';
import { ACHIEVEMENTS } from '@/lib/game/achievements';

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
  const [corp, chronicle] = await Promise.all([
    getPublicCorp(params.id),
    getCorpChronicle(params.id),
  ]);
  if (!corp) notFound();

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
                  <span className="text-slate-200">🏆 {formatMilestoneLabel(m.milestoneId)}</span>
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
                        <span aria-hidden="true">{charter?.icon || '🏛️'}</span> Era {era.eraIndex + 1}: {charter?.name || era.charterId}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold flex items-center gap-1">
                        <span aria-hidden="true">{ERA_MEDAL_ICON[era.medal]}</span> {ERA_MEDAL_LABEL[era.medal]}
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
            🚀 Build your space empire
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
