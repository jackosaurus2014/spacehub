'use client';

import { playSound } from '@/lib/game/sound-engine';

interface EventChoiceModalProps {
  eventName: string;
  eventIcon: string;
  eventDescription: string;
  choices: { label: string; description: string }[];
  onChoose: (choiceIndex: number) => void;
}

/**
 * Modal for random choice events — player must pick an option before the game continues.
 */
export default function EventChoiceModal({ eventName, eventIcon, eventDescription, choices, onChoose }: EventChoiceModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #12122a 0%, #0a0a1a 100%)' }}>
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-amber-500" />

        <div className="p-6">
          {/* Event header */}
          <div className="text-center mb-5">
            <span className="text-4xl block mb-3">{eventIcon}</span>
            <h3 className="text-xl font-bold text-white mb-1">{eventName}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{eventDescription}</p>
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
