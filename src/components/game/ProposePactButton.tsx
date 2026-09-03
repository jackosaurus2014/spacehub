'use client';

// ─── "Propose pact" — the Rivals-card entry point into corp diplomacy ───────
// Diplomacy (2026-09-02, docs/ECONOMY_PVP_2026-08.md "Diplomacy"). A
// self-contained button + inline form so any card that knows a rival's
// profile id (RivalsPanel today) can open a pact proposal without the full
// Corp Contracts panel. POSTs to /api/space-tycoon/corp-pacts; the server
// enforces every rule (one pact per pair per kind, 7–90 days, caps).

import { useId, useState } from 'react';
import { CORP_PACT_DEFS, CORP_PACT_DURATION_DAYS, CORP_PACT_KINDS } from '@/lib/game/corp-pacts';
import { playSound } from '@/lib/game/sound-engine';
import StatusPip from '@/components/ui/StatusPip';
import GameIcon from './GameIcon';

interface ProposePactButtonProps {
  targetProfileId: string;
  targetName: string;
  className?: string;
}

export default function ProposePactButton({ targetProfileId, targetName, className = '' }: ProposePactButtonProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>('no_poach');
  const [days, setDays] = useState<number>(CORP_PACT_DURATION_DAYS.default);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const formId = useId();

  const submit = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/space-tycoon/corp-pacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'propose', kind, counterpartyProfileId: targetProfileId, durationDays: days }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok) {
        playSound('milestone');
        setResult({ ok: true, text: `${CORP_PACT_DEFS[kind as keyof typeof CORP_PACT_DEFS]?.label ?? 'Pact'} proposed to ${targetName}. They will see it in their Situation Log.` });
      } else {
        playSound('error');
        setResult({ ok: false, text: String(data.message ?? data.error ?? `Request failed (${res.status})`) });
      }
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => { playSound('click'); setOpen(v => !v); }}
        aria-expanded={open}
        aria-controls={formId}
        aria-label={`Propose a pact to ${targetName}`}
        className="min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors inline-flex items-center gap-1.5"
      >
        <GameIcon name="scroll" size={12} /> Propose pact
      </button>
      {open && (
        <div id={formId} className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--elev)] p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="text-[11px] text-[var(--ink-3)] sm:col-span-2">
              <span className="block mb-1 uppercase tracking-[0.14em]">Kind</span>
              <select value={kind} onChange={e => setKind(e.target.value)} className="w-full min-h-[40px] px-2 rounded bg-[var(--surface)] text-[var(--ink)] text-[12px] border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--signal)]">
                {CORP_PACT_KINDS.map(k => <option key={k} value={k}>{CORP_PACT_DEFS[k].label}{CORP_PACT_DEFS[k].enforced ? '' : ' (registered only)'}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-[var(--ink-3)]">
              <span className="block mb-1 uppercase tracking-[0.14em]">Days</span>
              <input type="number" min={CORP_PACT_DURATION_DAYS.min} max={CORP_PACT_DURATION_DAYS.max} value={days}
                onChange={e => setDays(Math.max(7, Math.min(90, parseInt(e.target.value) || 7)))}
                className="w-full min-h-[40px] px-2 rounded bg-[var(--surface)] text-[var(--ink)] text-[12px] border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--signal)]" />
            </label>
          </div>
          <p className="text-[11px] text-[var(--ink-3)]">{CORP_PACT_DEFS[kind as keyof typeof CORP_PACT_DEFS]?.description}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={submit} disabled={busy} className="btn-primary !min-h-[40px] !py-1.5 !px-3 text-[12px] disabled:opacity-50">
              {busy ? 'Proposing…' : `Send to ${targetName}`}
            </button>
            {result && (
              <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-[11px]" style={{ color: result.ok ? 'var(--go)' : 'var(--crit)' }}>
                <StatusPip state={result.ok ? 'go' : 'scrub'} label={result.ok ? 'SENT' : 'REFUSED'} /> {result.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
