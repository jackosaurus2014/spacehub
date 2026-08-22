'use client';

// ─── Space Tycoon: The Legacy Hall (AAA Round 1, wave E4) ───────────────────
//
// docs/AAA_PROGRAM_2026-08.md §R1-E4. The surface that closes structural hole
// H4: "48 legacy milestones, 7 infinite stretches, 5 display tiers, 11 victory
// titles, 8 era medals, season prestige titles — and no surface anywhere that
// shows a player their own history. The trophies exist; the trophy room does
// not."
//
// SHAPE — why a hall and not a checklist. Master of Orion 2 and Stellaris make
// long-horizon achievement read as a RECORD OF A CIVILISATION: a standing, the
// standing's ceiling, the deeds, the names. So the Hall is one continuous
// scroll in that order, and it never sorts a player's history into "todo":
//
//   1  Standing        who you are now (Pioneer→Legend), and what the next
//                      rung literally requires, with live counts.
//   2  Standing ledger the six soft-capped bonus channels — raw vs applied vs
//                      ceiling. Round 1 called this "a genuinely interesting
//                      strategic readout that no player can see today".
//   3  Deeds           all 48 milestones, grouped by their tier, each with a
//                      real progress term or an honest binary state.
//   4  Dynasties       the 7 infinite stretches, with the real next rung.
//   5  The Record      titles worn and won, the era medal case, the retired
//                      bench, and the quarterly filings on file.
//
// EVERY NUMBER IS REAL. Progress comes from `legacy-hall.ts`, which authors one
// term per milestone mirroring that milestone's own `check`, guarded by a drift
// test. Where a condition has no honest fraction (target of 1 — "do you hold
// GEO?"), the row renders a STATE, never a fabricated percentage.
//
// ACCESSIBILITY (CLAUDE.md):
//  - every meter is a real `role="progressbar"` with min/max/now and a label
//    that carries the same numbers the bar draws;
//  - medal tier, milestone state and horizon are text + shape-distinct glyph
//    (`medal` vs `medal-outline`, `check` vs `lock`) — never colour alone;
//  - the filter is a `group` of `aria-pressed` buttons at 44px;
//  - headings run h2 (hall) → h3 (section) → h4 (tier group) with no skips;
//  - no bespoke animation is introduced, so the global reduced-motion guard in
//    GameStyles.tsx covers the whole surface;
//  - type floor 10px throughout (V8 canon).
//
// 375px: every grid is `grid-cols-1` first and every row wraps. The Hall is a
// browse-y surface, so it is authored phone-first and widened, not the reverse.

import { useMemo, useState } from 'react';
import type { GameState, GameTab, EraMedal } from '@/lib/game/types';
import {
  getLegacyStanding, getLegacyMilestoneViews, getLegacyStretchViews,
  getLegacyStandingBonuses, getLegacyTitles, getLegacyEraRoll, getLegacyFilingSummary,
  type LegacyMilestoneView, type LegacyProgressTerm, type LegacyHorizon,
  type LegacyStretchView, type LegacyTermUnit,
} from '@/lib/game/legacy-hall';
import type { LegacyBonusCategory } from '@/lib/game/legacy-system';
import { ERA_MEDAL_LABEL } from '@/lib/game/corp-era-registry';
import { getTierUnlockedTabs } from '@/lib/game/corporation-tiers';
import { formatMoney } from '@/lib/game/formulas';
import { ConsolePanel, HoloCard, DataChip, StatReadout, Figure } from './chrome';
import GameIcon from './GameIcon';
import HoloTip, { Concept } from './HoloTip';
import type { IconName } from '@/lib/game/icons';

// ─── Shared formatting ──────────────────────────────────────────────────────

function formatTermValue(value: number, unit: LegacyTermUnit): string {
  if (unit === 'money') return formatMoney(value);
  return Math.round(value).toLocaleString();
}

function formatEraDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const MEDAL_ICON: Record<EraMedal, IconName> = {
  platinum: 'medal', gold: 'medal', silver: 'medal', bronze: 'medal', filed: 'medal-outline',
};

const BONUS_CATEGORY_LABEL: Record<LegacyBonusCategory, string> = {
  revenue: 'Service revenue',
  costReduction: 'Cost reduction',
  miningOutput: 'Mining output',
  buildSpeed: 'Construction speed',
  researchSpeed: 'Research speed',
  crewCapacity: 'Crew capacity',
};

const DISPLAY_TIER_BLURB: Record<string, string> = {
  Pioneer: 'A first foothold above the atmosphere.',
  Colonist: 'Operations that outlive their founding contracts.',
  Admiral: 'A fleet and a footprint across the inner system.',
  Architect: 'A corporation that changes the places it operates in.',
  Legend: 'A name the Accord archives keep on its own shelf.',
};

// ─── Meter ──────────────────────────────────────────────────────────────────
// Never colour-only: the numeric readout beside the bar carries the same
// value, and the accessible name repeats it for a screen reader.

function Meter({ fraction, label, tone = 'cyan' }: { fraction: number; label: string; tone?: 'cyan' | 'amber' | 'slate' }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  const fill = tone === 'amber' ? 'bg-amber-400' : tone === 'slate' ? 'bg-slate-500' : 'bg-cyan-400';
  return (
    <div
      className="h-1.5 w-full bg-white/[0.07] rounded-full overflow-hidden"
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full ${fill} rounded-full transition-all`} style={{ width: `${pct}%` }} aria-hidden="true" />
    </div>
  );
}

function HorizonChip({ horizon }: { horizon: LegacyHorizon }) {
  return (
    <HoloTip
      content={{
        title: 'Generational horizon',
        icon: 'clock',
        body: (
          <>
            This target sits beyond what a best-in-class run reaches in fifty in-game years.
            It is deliberate long-horizon content, not a near-term goal — the game is honest about
            the distance rather than dressing it up as almost-there.
          </>
        ),
        source: horizon.basis,
      }}
      underline={false}
    >
      <DataChip tone="warn" icon="clock">Generational</DataChip>
    </HoloTip>
  );
}

/** The single honest progress readout. `fraction === null` means the condition
 *  has no meaningful gradient (a target of one), so a state word is shown
 *  instead of a bar — per legacy-hall.ts's honesty contract. */
function TermReadout({
  term, fraction, achieved, name,
}: { term: LegacyProgressTerm; fraction: number | null; achieved: boolean; name: string }) {
  if (achieved) {
    return (
      <DataChip tone="good" icon="check">Achieved</DataChip>
    );
  }
  if (fraction === null) {
    return (
      <div className="flex items-center gap-1.5">
        <DataChip tone="neutral" icon="lock">Not yet</DataChip>
        <span className="text-[10px] text-slate-500">{term.label}</span>
      </div>
    );
  }
  const pct = Math.round(fraction * 100);
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[10px] text-slate-500 truncate">{term.label}</span>
        <span className="text-[10px] text-slate-300 font-mono tabular-nums whitespace-nowrap">
          {formatTermValue(term.current, term.unit)} / {formatTermValue(term.target, term.unit)} · {pct}%
        </span>
      </div>
      <Meter
        fraction={fraction}
        label={`${name}: ${term.label} ${formatTermValue(term.current, term.unit)} of ${formatTermValue(term.target, term.unit)}, ${pct} percent`}
      />
    </div>
  );
}

// ─── 1 · Standing ───────────────────────────────────────────────────────────

function StandingSection({ state }: { state: GameState }) {
  const standing = useMemo(() => getLegacyStanding(state), [state]);
  const next = standing.next;

  return (
    <ConsolePanel
      title="Standing"
      icon="scroll"
      asH3
      subtitle={DISPLAY_TIER_BLURB[standing.displayTier] || ''}
      right={<DataChip tone="info" icon="medal">{standing.displayTier}</DataChip>}
      bodyClassName="mt-3 space-y-3"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatReadout label="Standing" value={standing.displayTier} icon="medal" size="lg" />
        <StatReadout
          label="Legacy Power"
          value={standing.legacyPower.toLocaleString()}
          icon="sparkle"
          size="lg"
          sub="Tier 1/2/3/4 milestones pay 10/25/50/100; each dynasty level pays 15."
        />
        <StatReadout
          label="Milestones"
          value={`${standing.milestonesEarned}/${standing.milestonesTotal}`}
          icon="check"
          size="lg"
        />
        <StatReadout
          label="Dynasty levels"
          value={standing.stretchLevels.toLocaleString()}
          icon="trending-up"
          size="lg"
        />
      </div>

      {/* The ladder, spelled out. These thresholds live in
          legacy-system.ts::getLegacyDisplayTier and have never been visible. */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">The ladder</h4>
        <ul className="space-y-1">
          {standing.steps.map(step => {
            const isCurrent = step.tier === standing.displayTier;
            return (
              <li
                key={step.tier}
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 border ${
                  isCurrent ? 'border-cyan-500/30 bg-cyan-500/[0.06]' : 'border-white/[0.05] bg-white/[0.015]'
                }`}
              >
                <GameIcon name={step.met ? 'medal' : 'medal-outline'} size={13} label="" />
                <span className="text-[11px] font-medium text-white w-[72px]">{step.tier}</span>
                <span className="text-[10px] text-slate-500 flex-1 min-w-[120px]">
                  {step.terms.length === 0
                    ? 'The floor — every corporation starts here.'
                    : step.terms.map(t => `${t.label} ${Math.round(t.current)}/${Math.round(t.target)}`).join(' · ')}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {isCurrent ? 'Current' : step.met ? 'Passed' : 'Ahead'}
                </span>
              </li>
            );
          })}
        </ul>
        {next && (
          <p className="text-[10px] text-slate-500">
            Next rung: <span className="text-slate-300">{next.tier}</span>
            {' — '}
            {next.terms.map(t => `${t.label} ${Math.round(t.current)} of ${Math.round(t.target)}`).join('; ')}.
          </p>
        )}
        {!next && (
          <p className="text-[10px] text-slate-500">
            Legend is the top of the ladder. The dynasties below keep counting.
          </p>
        )}
      </div>
    </ConsolePanel>
  );
}

// ─── 2 · Standing ledger (the soft caps) ────────────────────────────────────

function BonusLedgerSection({ state }: { state: GameState }) {
  const rows = useMemo(() => getLegacyStandingBonuses(state), [state]);
  const anyEarned = rows.some(r => r.raw > 0);

  return (
    <ConsolePanel
      title="Standing bonuses"
      icon="balance"
      asH3
      variant="secondary"
      subtitle="What the record is worth. Every legacy bonus converges on a ceiling, so the tenth milestone in a category pays less than the first — this is the readout that tells you when to diversify."
      bodyClassName="mt-3"
    >
      {!anyEarned ? (
        <p className="text-[11px] text-slate-500">
          No legacy bonuses yet. Earn your first milestone below and this ledger starts filling.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {rows.map(row => {
            const unit = row.hardCap ? ' slots' : '%';
            const pctOfCap = Math.round(row.capUsed * 100);
            return (
              <HoloCard key={row.category} className="p-2.5" variant={row.raw > 0 ? 'secondary' : 'inert'}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[11px] text-white font-medium">{BONUS_CATEGORY_LABEL[row.category]}</span>
                  <Figure
                    value={row.hardCap ? `+${Math.floor(row.effective)}` : `+${row.effective.toFixed(1)}`}
                    unit={unit}
                    className="text-[13px] text-cyan-300"
                  />
                </div>
                <Meter
                  fraction={row.capUsed}
                  tone="cyan"
                  label={`${BONUS_CATEGORY_LABEL[row.category]}: ${row.effective.toFixed(1)}${unit} applied of a ${row.cap}${unit} ceiling, ${pctOfCap} percent`}
                />
                <p className="text-[10px] text-slate-500 mt-1 tabular-nums">
                  {row.raw.toFixed(1)}{unit} earned · {pctOfCap}% of the {row.hardCap ? 'hard cap' : 'ceiling'} ({row.cap}{unit})
                  {row.lostToCap > 0.05 && ` · ${row.lostToCap.toFixed(1)}${unit} absorbed by the cap`}
                </p>
              </HoloCard>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-slate-600 mt-2">
        Percentage channels use a convergent cap — <span className="font-mono">cap x (1 - e^(-raw/cap))</span> — so
        they approach the ceiling without ever reaching it. Crew capacity is a hard clamp.
        {' '}<Concept id="legacy">Legacy</Concept>
      </p>
    </ConsolePanel>
  );
}

// ─── 3 · Deeds (the 48 milestones) ──────────────────────────────────────────

const TIER_GROUP_LABEL: Record<number, string> = {
  1: 'Pioneer deeds', 2: 'Colonist deeds', 3: 'Admiral deeds', 4: 'Architect deeds',
};

type DeedFilter = 'all' | 'earned' | 'open';

function MilestoneRow({ view }: { view: LegacyMilestoneView }) {
  return (
    <HoloCard className="p-2.5" variant={view.achieved ? 'primary' : 'secondary'}>
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        <GameIcon name={view.achieved ? 'medal' : 'medal-outline'} size={15} label="" />
        <div className="flex-1 min-w-[150px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-semibold ${view.achieved ? 'text-amber-200' : 'text-white'}`}>
              {view.name}
            </span>
            <DataChip tone="neutral">
              {view.bonusCategory === 'crewCapacity'
                ? `+${view.bonusValue} crew`
                : `+${view.bonusValue}% ${BONUS_CATEGORY_LABEL[view.bonusCategory].toLowerCase()}`}
            </DataChip>
            {view.horizon && <HorizonChip horizon={view.horizon} />}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{view.description}</p>
        </div>
        <div className="w-full sm:w-44 shrink-0">
          <TermReadout term={view.term} fraction={view.fraction} achieved={view.achieved} name={view.name} />
        </div>
      </div>
    </HoloCard>
  );
}

function DeedsSection({ state }: { state: GameState }) {
  const views = useMemo(() => getLegacyMilestoneViews(state), [state]);
  const [filter, setFilter] = useState<DeedFilter>('all');

  const earnedCount = views.filter(v => v.achieved).length;
  const filtered = views.filter(v => (filter === 'earned' ? v.achieved : filter === 'open' ? !v.achieved : true));
  const tiers: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  const FILTERS: { id: DeedFilter; label: string }[] = [
    { id: 'all', label: `All (${views.length})` },
    { id: 'earned', label: `Earned (${earnedCount})` },
    { id: 'open', label: `Outstanding (${views.length - earnedCount})` },
  ];

  return (
    <ConsolePanel
      title="Deeds"
      icon="archive"
      asH3
      subtitle="Every milestone your corporation has earned or has yet to earn. Earned deeds are permanent — decommissioning what earned them never takes one back."
      right={
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter deeds">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-[44px] px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors whitespace-nowrap ${
                filter === f.id ? 'game-tab-active text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
      bodyClassName="mt-3 space-y-4"
    >
      {filtered.length === 0 && (
        <p className="text-[11px] text-slate-500">Nothing in this view yet.</p>
      )}
      {tiers.map(tier => {
        const group = filtered.filter(v => v.tier === tier);
        if (group.length === 0) return null;
        const groupEarned = views.filter(v => v.tier === tier && v.achieved).length;
        const groupTotal = views.filter(v => v.tier === tier).length;
        return (
          <section key={tier} aria-labelledby={`legacy-deeds-tier-${tier}`}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <h4 id={`legacy-deeds-tier-${tier}`} className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {TIER_GROUP_LABEL[tier]}
              </h4>
              <span className="text-[10px] text-slate-500 font-mono tabular-nums">{groupEarned}/{groupTotal}</span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              {group.map(v => <MilestoneRow key={v.id} view={v} />)}
            </div>
          </section>
        );
      })}
    </ConsolePanel>
  );
}

// ─── 4 · Dynasties (infinite stretches) ─────────────────────────────────────

function DynastyRow({ view }: { view: LegacyStretchView }) {
  const pct = Math.round(view.fraction * 100);
  return (
    <HoloCard className="p-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
        <span className="text-[11px] font-semibold text-white">{view.name}</span>
        <DataChip tone={view.level > 0 ? 'info' : 'neutral'}>Level {view.level}</DataChip>
        <DataChip tone="neutral">
          {view.bonusCategory === 'crewCapacity'
            ? `+${view.rawContribution.toFixed(1)} crew earned`
            : `+${view.rawContribution.toFixed(1)}% ${BONUS_CATEGORY_LABEL[view.bonusCategory].toLowerCase()} earned`}
        </DataChip>
        {view.horizon && <HorizonChip horizon={view.horizon} />}
      </div>
      <p className="text-[10px] text-slate-500 mb-1.5">{view.description}</p>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[10px] text-slate-500">Toward level {view.level + 1}</span>
        <span className="text-[10px] text-slate-300 font-mono tabular-nums">
          {formatTermValue(view.progress, view.unit)} / {formatTermValue(view.nextRequirement, view.unit)} · {pct}%
        </span>
      </div>
      <Meter
        fraction={view.fraction}
        tone="amber"
        label={`${view.name}: ${formatTermValue(view.progress, view.unit)} of ${formatTermValue(view.nextRequirement, view.unit)} toward level ${view.level + 1}, ${pct} percent`}
      />
    </HoloCard>
  );
}

function DynastiesSection({ state }: { state: GameState }) {
  const views = useMemo(() => getLegacyStretchViews(state), [state]);
  return (
    <ConsolePanel
      title="Dynasties"
      icon="trending-up"
      asH3
      variant="secondary"
      subtitle="Seven counters that never finish. Each level costs more than the last and pays a shrinking share into its bonus channel — the compounding half of long-horizon progression."
      bodyClassName="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-2"
    >
      {views.map(v => <DynastyRow key={v.id} view={v} />)}
    </ConsolePanel>
  );
}

// ─── 5 · The Record ─────────────────────────────────────────────────────────

function TitlesBlock({ state, onNavigateTab, victoryUnlocked }: {
  state: GameState; onNavigateTab: (tab: GameTab) => void; victoryUnlocked: boolean;
}) {
  const titles = useMemo(() => getLegacyTitles(state), [state]);
  const held = titles.filter(t => t.earned);
  const outstanding = titles.filter(t => !t.earned);
  const worn = titles.find(t => t.worn) || null;

  return (
    <ConsolePanel
      title="Titles"
      icon="victory"
      asH3
      variant="secondary"
      subtitle="What the world calls your corporation. Victory titles outrank achievement titles when both are held — the rarer honour is the one that shows on the standings."
      bodyClassName="mt-3 space-y-3"
      right={
        victoryUnlocked ? (
          <button
            type="button"
            onClick={() => onNavigateTab('victory')}
            className="min-h-[44px] px-2.5 py-1 rounded-lg text-[10px] font-medium text-cyan-300 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Full victory board
          </button>
        ) : undefined
      }
    >
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Currently worn</p>
        {worn ? (
          <p className="text-[13px] text-amber-200 font-semibold">
            &ldquo;{worn.title}&rdquo;{' '}
            <span className="text-[10px] text-slate-500 font-normal">
              — {worn.awardName} ({worn.source === 'victory' ? 'victory' : 'achievement'})
            </span>
          </p>
        ) : state.playerTitle ? (
          <p className="text-[13px] text-amber-200 font-semibold">
            &ldquo;{state.playerTitle}&rdquo;{' '}
            <span className="text-[10px] text-slate-500 font-normal">— awarded outside the victory and achievement rolls</span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">None yet. Titles come from victories and from achievements.</p>
        )}
      </div>

      {held.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
            Held ({held.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {held.map(t => (
              <span
                key={`${t.source}-${t.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-2 py-1"
              >
                <GameIcon name={t.source === 'victory' ? 'victory' : 'medal'} size={12} label="" />
                <span className="text-[11px] text-amber-100 font-medium">{t.title}</span>
                <span className="text-[10px] text-slate-500">{t.awardName}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
          Unclaimed victory titles ({outstanding.length})
        </h4>
        {outstanding.length === 0 ? (
          <p className="text-[11px] text-slate-500">Every victory title is yours.</p>
        ) : (
          <ul className="space-y-1">
            {outstanding.map(t => {
              const pct = t.fraction === null ? null : Math.round(t.fraction * 100);
              return (
                <li key={`${t.source}-${t.id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1 rounded-lg bg-white/[0.015] border border-white/[0.05]">
                  <GameIcon name="lock" size={11} label="" />
                  <span className="text-[11px] text-slate-300 font-medium">{t.title}</span>
                  <span className="text-[10px] text-slate-500 flex-1 min-w-[100px]">{t.awardName}</span>
                  {pct === null ? (
                    <DataChip tone="neutral">Not yet</DataChip>
                  ) : (
                    <span className="text-[10px] font-mono tabular-nums text-slate-400">{pct}%</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ConsolePanel>
  );
}

function EraCaseBlock({ state, onNavigateTab, governanceUnlocked }: {
  state: GameState; onNavigateTab: (tab: GameTab) => void; governanceUnlocked: boolean;
}) {
  const roll = useMemo(() => getLegacyEraRoll(state), [state]);

  return (
    <ConsolePanel
      title="Era medal case"
      icon="cal-corporate-era"
      asH3
      variant="secondary"
      subtitle="Ninety real days per chartered era, graded against a bracket-scaled goal. The medal is permanent; the charter that earned it is on the record."
      bodyClassName="mt-3 space-y-3"
      right={
        governanceUnlocked ? (
          <button
            type="button"
            onClick={() => onNavigateTab('governance')}
            className="min-h-[44px] px-2.5 py-1 rounded-lg text-[10px] font-medium text-cyan-300 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Charter an era
          </button>
        ) : undefined
      }
    >
      {roll.medalCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {roll.medalCounts.map(m => (
            <span
              key={m.medal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1"
            >
              <GameIcon name={MEDAL_ICON[m.medal]} size={13} label="" />
              <span className="text-[11px] text-white font-medium">{ERA_MEDAL_LABEL[m.medal]}</span>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">x{m.count}</span>
            </span>
          ))}
        </div>
      )}

      {roll.active.active && roll.active.charter ? (
        <HoloCard className="p-2.5" variant="primary">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
            <DataChip tone="info" icon="activity">Era in progress</DataChip>
            <span className="text-[11px] font-semibold text-white">{roll.active.charter.name}</span>
            <HoloTip content={{ title: 'Era Medal', icon: 'medal', body: <Concept id="era-medal" /> }} underline={false}>
              <DataChip tone="neutral" icon={MEDAL_ICON[roll.active.liveMedal]}>
                Currently {ERA_MEDAL_LABEL[roll.active.liveMedal]}
              </DataChip>
            </HoloTip>
          </div>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-[10px] text-slate-500">{roll.active.charter.goalLabel}</span>
            <span className="text-[10px] text-slate-300 font-mono tabular-nums">
              {Math.round(roll.active.goalActual).toLocaleString()} / {Math.round(roll.active.goalTarget).toLocaleString()}
              {' · '}{Math.ceil(roll.active.daysRemaining)}d left
            </span>
          </div>
          <Meter
            fraction={roll.active.goalTarget > 0 ? roll.active.goalActual / roll.active.goalTarget : 0}
            label={`${roll.active.charter.name}: ${roll.active.charter.goalLabel} ${Math.round(roll.active.goalActual)} of ${Math.round(roll.active.goalTarget)}`}
          />
        </HoloCard>
      ) : (
        <p className="text-[11px] text-slate-500">
          No era chartered right now.{governanceUnlocked ? ' Board mandates are declared in Governance.' : ' Board mandates open at Corporation Tier 4.'}
        </p>
      )}

      {roll.completed.length === 0 ? (
        <p className="text-[11px] text-slate-500">No eras closed yet — the first one enters the record ninety real days after it is chartered.</p>
      ) : (
        <ul className="space-y-1.5">
          {roll.completed.map(era => (
            <li key={era.eraIndex} className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <GameIcon name={MEDAL_ICON[era.medal]} size={13} label="" />
                <span className="text-[11px] font-semibold text-white">{era.charterName}</span>
                <DataChip tone="neutral">{ERA_MEDAL_LABEL[era.medal]}</DataChip>
                <span className="text-[10px] text-slate-500 flex-1 min-w-[110px]">
                  Era {era.eraIndex + 1} · {formatEraDate(era.startedAtMs)} to {formatEraDate(era.endedAtMs)}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-slate-400">
                  {Math.round(era.goalActual).toLocaleString()} / {Math.round(era.goalTarget).toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{era.goalLabel}</p>
            </li>
          ))}
        </ul>
      )}
    </ConsolePanel>
  );
}

function BenchBlock({ state, onNavigateTab, commandersUnlocked }: {
  state: GameState; onNavigateTab: (tab: GameTab) => void; commandersUnlocked: boolean;
}) {
  const retired = state.retiredLeaders || [];
  if (retired.length === 0) return null;
  const bench = [...retired].sort((a, b) => b.retiredAtMs - a.retiredAtMs);

  return (
    <ConsolePanel
      title="The retired bench"
      icon="commanders"
      asH3
      variant="secondary"
      subtitle="Leaders who served a full term and stepped aside. Their institutional memory is the Leadership Dynasty above."
      bodyClassName="mt-3"
      right={
        commandersUnlocked ? (
          <button
            type="button"
            onClick={() => onNavigateTab('commanders')}
            className="min-h-[44px] px-2.5 py-1 rounded-lg text-[10px] font-medium text-cyan-300 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Command roster
          </button>
        ) : undefined
      }
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {bench.map((leader, i) => (
          <li
            key={`${leader.definitionId}-${leader.retiredAtMs}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-2 py-1.5"
          >
            <span
              className="shrink-0 w-8 h-8 rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] grid place-items-center text-[11px] font-bold text-cyan-200"
              aria-hidden="true"
            >
              {leader.name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-white font-medium truncate">{leader.name}</p>
              <p className="text-[10px] text-slate-500 truncate">
                {leader.class} · {leader.rarity} · {Math.round(leader.monthsServed)} months served
              </p>
            </div>
          </li>
        ))}
      </ul>
    </ConsolePanel>
  );
}

function FilingsBlock({ state, onOpenQuarterly }: { state: GameState; onOpenQuarterly: () => void }) {
  const filings = useMemo(() => getLegacyFilingSummary(state), [state]);

  return (
    <ConsolePanel
      title="Filings on record"
      icon="reports"
      asH3
      variant="secondary"
      subtitle="Quarterly reports are the corporation's public financial history. They are generated automatically; publishing one to the Corporate Registry is always your choice."
      bodyClassName="mt-3"
      right={
        filings.quartersOnFile > 0 ? (
          <button
            type="button"
            onClick={onOpenQuarterly}
            className="min-h-[44px] px-2.5 py-1 rounded-lg text-[10px] font-medium text-cyan-300 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Open the filings
          </button>
        ) : undefined
      }
    >
      {filings.quartersOnFile === 0 ? (
        <p className="text-[11px] text-slate-500">
          No quarters closed yet. The first report files after three game-months of trading.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <StatReadout label="Quarters on file" value={filings.quartersOnFile.toLocaleString()} icon="calendar" />
          <StatReadout label="Latest quarter" value={filings.latestQuarterNumber !== null ? `Q${filings.latestQuarterNumber}` : '—'} icon="clock" />
          <StatReadout
            label="Net worth (latest)"
            value={filings.latestNetWorth !== null ? formatMoney(filings.latestNetWorth) : '—'}
            icon="money"
          />
          <StatReadout
            label="Profit across filings"
            value={formatMoney(filings.lifetimeFiledProfit)}
            icon="market"
            sub={filings.latestGrowthPct !== null
              ? `Latest quarter: ${filings.latestGrowthPct >= 0 ? '+' : ''}${filings.latestGrowthPct.toFixed(1)}% net worth`
              : 'First report on file'}
          />
        </div>
      )}
    </ConsolePanel>
  );
}

// ─── The Hall ───────────────────────────────────────────────────────────────

export interface LegacyHallPanelProps {
  state: GameState;
  /** Same tab-switch handler the Outliner and Situation Log use. */
  onNavigateTab: (tab: GameTab) => void;
  /** Switches the parent Reports hub to its Quarterly sub-view. */
  onOpenQuarterly: () => void;
}

export default function LegacyHallPanel({ state, onNavigateTab, onOpenQuarterly }: LegacyHallPanelProps) {
  // Deep-links are rendered only for tabs the player's corporation tier has
  // actually unlocked — a link into a locked tab is a render hole, not a
  // teaser (see the E3 follow-up list).
  const unlocked = useMemo(() => new Set(getTierUnlockedTabs(state.corporationTier || 1)), [state.corporationTier]);

  return (
    <div className="space-y-3">
      <ConsolePanel
        title="Legacy Hall"
        icon="scroll"
        accent="amber"
        subtitle="The permanent record of your corporation — the standing it holds, the deeds behind it, the titles it wears, and the eras it has closed. Nothing here can be spent or lost."
      />
      <StandingSection state={state} />
      <BonusLedgerSection state={state} />
      <DeedsSection state={state} />
      <DynastiesSection state={state} />
      <TitlesBlock state={state} onNavigateTab={onNavigateTab} victoryUnlocked={unlocked.has('victory')} />
      <EraCaseBlock state={state} onNavigateTab={onNavigateTab} governanceUnlocked={unlocked.has('governance')} />
      <BenchBlock state={state} onNavigateTab={onNavigateTab} commandersUnlocked={unlocked.has('commanders')} />
      <FilingsBlock state={state} onOpenQuarterly={onOpenQuarterly} />
    </div>
  );
}
