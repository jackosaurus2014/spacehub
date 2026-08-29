'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Let anyone call it (roadmap Tier 2 #13). A pick is stored in the browser
// with no account; staking credits still happens in the game. The settled
// list reads the same store to show "you called it".

const KEY = 'sn:predictions:picks:v1';
type Picks = Record<string, { optionId: string; at: string }>;

function readPicks(): Picks {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) || '{}') as Picks; } catch { return {}; }
}
function writePick(questionId: string, optionId: string) {
  try {
    const p = readPicks(); p[questionId] = { optionId, at: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent('sn:predictions:picks'));
  } catch { /* best effort */ }
}

export interface PickOption { id: string; label: string }

export function PredictionPicker({ questionId, options, stakeHref }: { questionId: string; options: PickOption[]; stakeHref: string }) {
  const [pick, setPick] = useState<string | null>(null);
  useEffect(() => { setPick(readPicks()[questionId]?.optionId ?? null); }, [questionId]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => {
        const chosen = pick === o.id;
        return (
          <button
            key={o.id} type="button" aria-pressed={chosen}
            onClick={() => { writePick(questionId, o.id); setPick(o.id); }}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${chosen ? 'border-cyan-400 bg-cyan-500/20 text-white' : 'border-white/[0.1] bg-white/[0.04] text-white hover:border-cyan-500/40 hover:bg-cyan-500/10'}`}
          >
            {chosen ? '✓ ' : ''}{o.label}
          </button>
        );
      })}
      {pick && (
        <Link href={`${stakeHref}&pick=${encodeURIComponent(pick)}`} className="text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-2 self-center">
          Back it with credits in Space Tycoon →
        </Link>
      )}
    </div>
  );
}

export function SettledPickBadge({ questionId, winningOptionId }: { questionId: string; winningOptionId: string | null }) {
  const [pick, setPick] = useState<string | null>(null);
  useEffect(() => { setPick(readPicks()[questionId]?.optionId ?? null); }, [questionId]);
  if (!pick || !winningOptionId) return null;
  const right = pick === winningOptionId;
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${right ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>
      {right ? 'You called it' : 'Your call missed'}
    </span>
  );
}
