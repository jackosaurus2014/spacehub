'use client';

// ─── First-Hour Guide Overlay (FTUE v2) ─────────────────────────────────────
// Renders the onboarding objective chain from src/lib/game/onboarding.ts —
// the pure module owns step definitions, completion detection, and reward
// grants; this component is presentation only. Replaces the pre-archetype
// 5-step overlay whose "build your first launch pad" step auto-completed
// instantly against archetype starting buildings (simulated-newcomer audit,
// 2026-08-16).
//
// Mobile: collapsible to a one-line pill so the guide never owns a phone
// screen; expanded card is top-center, max-w-md, 44px+ targets throughout.

import { useEffect, useRef, useState } from 'react';
import { playSound } from '@/lib/game/sound-engine';
import type { GameState, GameTab } from '@/lib/game/types';
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_MAP,
  getCurrentOnboardingStep,
  isOnboardingActive,
  isOnboardingStepComplete,
} from '@/lib/game/onboarding';
import { formatMoney } from '@/lib/game/formulas';

interface TutorialOverlayProps {
  state: GameState;
  currentTab: GameTab;
  /** Advance the chain. `manual` = the player clicked Next/Finish; detection-
   *  backed steps only advance when their objective is actually met. */
  onAdvance: (manual: boolean) => void;
  onSkip: () => void;
  onSetTab: (tab: GameTab) => void;
}

export default function TutorialOverlay({ state, currentTab, onAdvance, onSkip, onSetTab }: TutorialOverlayProps) {
  const stepDef = getCurrentOnboardingStep(state);
  const stepNumber = stepDef?.step ?? 0;
  const detected = stepDef ? isOnboardingStepComplete(state, stepDef.step) : false;
  const [collapsed, setCollapsed] = useState(false);
  const prevStepRef = useRef(stepNumber);

  // Auto-advance: when the current step's objective is detected in state,
  // advance after a short beat so the player sees the result of their action.
  // The reward grant happens inside advanceOnboarding (pure), not here.
  useEffect(() => {
    if (!stepDef || !detected) return;
    const timer = setTimeout(() => {
      playSound('milestone');
      onAdvance(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [stepDef, detected, onAdvance]);

  // Step-change chirp + auto-expand so a new objective is never missed while
  // collapsed.
  useEffect(() => {
    if (prevStepRef.current !== stepNumber && stepNumber >= 1) {
      playSound('click');
      setCollapsed(false);
    }
    prevStepRef.current = stepNumber;
  }, [stepNumber]);

  if (!isOnboardingActive(state) || !stepDef) return null;

  const totalSteps = ONBOARDING_STEPS.length;
  const progressPct = ((stepDef.step - 1) / totalSteps) * 100;
  const isLast = stepDef.step === totalSteps;

  const handleGoToTab = () => {
    playSound('click');
    onSetTab(stepDef.targetTab);
  };

  if (collapsed) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto">
        <button
          onClick={() => { playSound('click'); setCollapsed(false); }}
          className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-xl shadow-black/50"
          style={{
            background: 'linear-gradient(135deg, rgba(10,10,20,0.97), rgba(15,15,30,0.97))',
            border: '1px solid rgba(34,211,238,0.35)',
            color: '#22d3ee',
          }}
          aria-label={`Expand guide — step ${stepDef.step} of ${totalSteps}: ${stepDef.title}`}
        >
          <span aria-hidden="true">{stepDef.icon}</span>
          Guide {stepDef.step}/{totalSteps}
          <span aria-hidden="true">▾</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[95vw] max-w-md animate-reveal-up pointer-events-auto">
      <div
        className="rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(10,10,20,0.97) 0%, rgba(15,15,30,0.97) 100%)',
          border: '1px solid rgba(34,211,238,0.3)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Progress bar */}
        <div className="h-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-1 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #06b6d4, #22d3ee)' }}
          />
        </div>

        <div className="p-4">
          {/* Header row: step counter + collapse + skip */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}
              >
                First-Hour Guide
              </span>
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {stepDef.step} / {totalSteps}
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => { playSound('click'); setCollapsed(true); }}
                className="min-h-[44px] px-2 text-[10px] uppercase tracking-wider transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                aria-label="Minimize guide"
              >
                Minimize
              </button>
              <button
                onClick={() => { playSound('click'); onSkip(); }}
                className="min-h-[44px] px-2 text-[10px] uppercase tracking-wider transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Skip Guide
              </button>
            </div>
          </div>

          {/* Content: what / why / where */}
          <div className="flex items-start gap-3 mb-3" aria-live="polite">
            <span className="text-2xl shrink-0 mt-0.5" aria-hidden="true">{stepDef.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">{stepDef.title}</h3>
              <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {stepDef.what}
              </p>
              <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span className="font-semibold" style={{ color: 'rgba(34,211,238,0.8)' }}>Why: </span>
                {stepDef.why}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span className="font-semibold" style={{ color: 'rgba(251,191,36,0.8)' }}>Where: </span>
                {stepDef.where}
              </p>
            </div>
          </div>

          {/* Reward preview — honest, small, one-time */}
          {stepDef.rewardMoney > 0 && (
            <p className="text-[10px] mb-2 font-mono" style={{ color: '#4ade80' }}>
              Completion grant: +{formatMoney(stepDef.rewardMoney)} (one-time)
            </p>
          )}

          {/* Detected state — the beat before auto-advance */}
          {detected && (
            <p role="status" className="text-[11px] font-semibold mb-2" style={{ color: '#4ade80' }}>
              ✓ Done — moving on…
            </p>
          )}

          {/* Tab suggestion — clickable to navigate */}
          {currentTab !== stepDef.targetTab && !detected && (
            <button
              onClick={handleGoToTab}
              className="w-full min-h-[44px] mb-3 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:brightness-110"
              style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}
            >
              Go to {stepDef.targetTab.charAt(0).toUpperCase() + stepDef.targetTab.slice(1)} tab
            </button>
          )}

          {/* Manual advance only where the step allows it (orientation +
              horizon steps); detection-backed steps advance themselves. */}
          {stepDef.manualAdvance && !detected && (
            <button
              onClick={() => { playSound('click'); onAdvance(true); }}
              className="w-full min-h-[44px] py-2 text-xs font-semibold text-white rounded-lg transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 2px 8px rgba(6,182,212,0.3)' }}
            >
              {isLast ? 'Finish — play on my own' : 'Next'}
            </button>
          )}

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-3" aria-hidden="true">
            {ONBOARDING_STEPS.map(s => (
              <div
                key={s.step}
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{
                  background: s.step === stepDef.step
                    ? '#22d3ee'
                    : s.step < stepDef.step
                      ? 'rgba(34,211,238,0.4)'
                      : 'rgba(255,255,255,0.15)',
                  boxShadow: s.step === stepDef.step ? '0 0 6px #22d3ee' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: target tab for the current step (page.tsx pulses that tab) ─────

export function getTutorialTargetTab(tutorialStep: number | undefined): GameTab | null {
  if (!tutorialStep || tutorialStep < 1 || tutorialStep > ONBOARDING_STEPS.length) return null;
  return ONBOARDING_STEP_MAP.get(tutorialStep)?.targetTab ?? null;
}
