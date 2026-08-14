'use client';

import { playSound } from '@/lib/game/sound-engine';
import { useModalA11y } from './useModalA11y';

interface EventChoiceModalProps {
  eventName: string;
  eventIcon: string;
  eventDescription: string;
  choices: { label: string; description: string; consequencePreview?: string[] }[];
  onChoose: (choiceIndex: number) => void;
  /** 4X Wave W4 (narrative-events.ts): set when this choice is a stage in a
   *  multi-stage narrative chain rather than a one-shot random event — shows
   *  a chain-progress indicator per docs/4X_BASELINE_2026-08.md Part 4 W5
   *  ("richer layout, chain-progress indicator, consequence preview"). */
  chainName?: string;
  stageIndex?: number;
  totalStages?: number;
}

/**
 * Modal for random choice events — player must pick an option before the game continues.
 * This is a mandatory-choice modal: there is no cancel action, so Escape intentionally
 * does not dismiss it (the underlying hook is given a no-op close). We still get Tab
 * focus-trapping between the choice buttons and initial focus placed inside the modal.
 */
export default function EventChoiceModal({ eventName, eventIcon, eventDescription, choices, onChoose, chainName, stageIndex, totalStages }: EventChoiceModalProps) {
  const modalRef = useModalA11y<HTMLDivElement>(() => {});
  const isChain = !!chainName && typeof stageIndex === 'number' && typeof totalStages === 'number' && totalStages > 0;

  return (
    <div ref={modalRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="alertdialog" aria-modal="true" aria-labelledby="event-title" aria-describedby="event-desc">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm game-modal-backdrop" aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden game-modal-card" style={{ background: 'linear-gradient(180deg, #12122a 0%, #0a0a1a 100%)' }}>
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-amber-500" aria-hidden="true" />

        <div className="p-6">
          {/* Chain progress indicator */}
          {isChain && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">{chainName}</span>
                <span className="text-[10px] text-slate-500">Stage {(stageIndex as number) + 1} of {totalStages}</span>
              </div>
              <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden" role="progressbar" aria-valuenow={(stageIndex as number) + 1} aria-valuemin={1} aria-valuemax={totalStages} aria-label={`${chainName} progress`}>
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-amber-500 transition-all"
                  style={{ width: `${(((stageIndex as number) + 1) / (totalStages as number)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Event header */}
          <div className="text-center mb-5">
            <span className="text-4xl block mb-3" aria-hidden="true">{eventIcon}</span>
            <h3 id="event-title" className="text-xl font-bold text-white mb-1">{eventName}</h3>
            <p id="event-desc" className="text-slate-400 text-sm leading-relaxed">{eventDescription}</p>
          </div>

          {/* Choices */}
          <div className="space-y-3">
            {choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => { playSound('click'); onChoose(i); }}
                className="w-full text-left p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-500/30 transition-all group"
              >
                <p className="text-white text-sm font-semibold group-hover:text-cyan-300 transition-colors">
                  {choice.label}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">{choice.description}</p>
                {choice.consequencePreview && choice.consequencePreview.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Expected consequences">
                    {choice.consequencePreview.map((p, pi) => (
                      <span key={pi} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-400 font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          <p className="text-slate-600 text-[10px] text-center mt-4">
            Choose wisely — this decision cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}
