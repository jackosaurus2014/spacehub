'use client';

import { useEffect, useRef } from 'react';
import { playSound } from '@/lib/game/sound-engine';
import type { GameState, GameTab } from '@/lib/game/types';

// ─── Tutorial Step Definitions ──────────────────────────────────────────────

interface TutorialStepDef {
  step: number;
  title: string;
  description: string;
  targetTab: GameTab;
  icon: string;
}

const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    step: 1,
    title: 'Build Your First Launch Pad',
    description: 'Go to the Build tab and construct a Small Launch Pad on Earth. This is the foundation of your space empire.',
    targetTab: 'build',
    icon: '\u{1F3D7}\uFE0F', // construction crane
  },
  {
    step: 2,
    title: 'Start Research',
    description: 'Switch to the Research tab and begin your first technology project. Research unlocks new buildings, services, and locations.',
    targetTab: 'research',
    icon: '\u{1F52C}', // microscope
  },
  {
    step: 3,
    title: 'Revenue from Services',
    description: 'When buildings complete, they automatically enable revenue-generating services. Check the Dashboard to see your income.',
    targetTab: 'dashboard',
    icon: '\u{1F4B0}', // money bag
  },
  {
    step: 4,
    title: 'Explore the Solar System',
    description: 'Open the Map to see all locations. Research and build to unlock new destinations \u2014 from LEO to the outer solar system.',
    targetTab: 'map',
    icon: '\u{1F5FA}\uFE0F', // world map
  },
  {
    step: 5,
    title: "You're Ready!",
    description: 'Build infrastructure, research technology, mine resources, and expand across the solar system. Check Reports for probe discoveries and the Market for trading.',
    targetTab: 'dashboard',
    icon: '\u{1F680}', // rocket
  },
];

// ─── Auto-advance conditions ────────────────────────────────────────────────

function shouldAutoAdvance(step: number, state: GameState, currentTab: GameTab): boolean {
  switch (step) {
    case 1: return state.buildings.length > 0;
    case 2: return state.activeResearch !== null;
    case 3: return state.activeServices.length > 0;
    case 4: return currentTab === 'map';
    default: return false;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface TutorialOverlayProps {
  state: GameState;
  currentTab: GameTab;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onSetTab: (tab: GameTab) => void;
}

export default function TutorialOverlay({
  state,
  currentTab,
  onNext,
  onSkip,
  onComplete,
  onSetTab,
}: TutorialOverlayProps) {
  const tutorialStep = state.tutorialStep ?? 6;
  const prevStepRef = useRef(tutorialStep);

  // Auto-advance: check if the player completed the current step's objective
  useEffect(() => {
    if (tutorialStep < 1 || tutorialStep > 5) return;
    if (shouldAutoAdvance(tutorialStep, state, currentTab)) {
      // Small delay so the player sees the result of their action first
      const timer = setTimeout(() => {
        if (tutorialStep === 5) {
          onComplete();
        } else {
          playSound('click');
          onNext();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [tutorialStep, state.buildings.length, state.activeResearch, state.activeServices.length, currentTab, onNext, onComplete]);

  // Play a subtle sound when advancing steps
  useEffect(() => {
    if (prevStepRef.current !== tutorialStep && tutorialStep >= 1 && tutorialStep <= 5) {
      playSound('click');
    }
    prevStepRef.current = tutorialStep;
  }, [tutorialStep]);

  // Don't render if tutorial is not active (step 0 or 6+)
  if (tutorialStep < 1 || tutorialStep > 5) return null;

  const stepDef = TUTORIAL_STEPS.find(s => s.step === tutorialStep);
  if (!stepDef) return null;

  const isLast = tutorialStep === 5;
  const progressPct = (tutorialStep / 5) * 100;

  const handleGoToTab = () => {
    playSound('click');
    onSetTab(stepDef.targetTab);
  };

  const handleNextClick = () => {
    playSound('click');
    if (isLast) {
      onComplete();
    } else {
      onNext();
    }
  };

  const handleSkipClick = () => {
    playSound('click');
    onSkip();
  };

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
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #06b6d4, #22d3ee)',
            }}
          />
        </div>

        <div className="p-4">
          {/* Header row: step counter + skip */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(34,211,238,0.1)',
                  color: '#22d3ee',
                  border: '1px solid rgba(34,211,238,0.2)',
                }}
              >
                Tutorial
              </span>
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Step {tutorialStep} of 5
              </span>
            </div>
            <button
              onClick={handleSkipClick}
              className="text-[10px] uppercase tracking-wider transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Skip Tutorial
            </button>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl shrink-0 mt-0.5">{stepDef.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">{stepDef.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {stepDef.description}
              </p>
            </div>
          </div>

          {/* Tab suggestion — clickable to navigate */}
          {currentTab !== stepDef.targetTab && (
            <button
              onClick={handleGoToTab}
              className="w-full mb-3 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:brightness-110"
              style={{
                background: 'rgba(34,211,238,0.08)',
                border: '1px solid rgba(34,211,238,0.2)',
                color: '#22d3ee',
              }}
            >
              Go to {stepDef.targetTab.charAt(0).toUpperCase() + stepDef.targetTab.slice(1)} tab
            </button>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleNextClick}
              className="flex-1 py-2 text-xs font-semibold text-white rounded-lg transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                boxShadow: '0 2px 8px rgba(6,182,212,0.3)',
              }}
            >
              {isLast ? 'Got it!' : 'Next'}
            </button>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {TUTORIAL_STEPS.map(s => (
              <div
                key={s.step}
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{
                  background: s.step === tutorialStep
                    ? '#22d3ee'
                    : s.step < tutorialStep
                      ? 'rgba(34,211,238,0.4)'
                      : 'rgba(255,255,255,0.15)',
                  boxShadow: s.step === tutorialStep ? '0 0 6px #22d3ee' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: Get the target tab for the current tutorial step (for pulsing) ─

export function getTutorialTargetTab(tutorialStep: number | undefined): GameTab | null {
  if (!tutorialStep || tutorialStep < 1 || tutorialStep > 5) return null;
  const stepDef = TUTORIAL_STEPS.find(s => s.step === tutorialStep);
  return stepDef?.targetTab ?? null;
}
