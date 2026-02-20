'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'spacenexus-onboarding-complete';
const PERSONA_KEY = 'spacenexus-user-persona';

export type UserPersona = 'investor' | 'entrepreneur' | 'mission-planner' | 'executive' | 'supply-chain' | 'legal';

const PERSONAS: { id: UserPersona; icon: string; title: string; description: string }[] = [
  { id: 'investor', icon: '\u{1F4B8}', title: 'Investor / VC', description: 'Evaluate deals, track funding rounds, generate investment theses' },
  { id: 'entrepreneur', icon: '\u{1F680}', title: 'Entrepreneur / Founder', description: 'Find grants, build business models, discover customers' },
  { id: 'mission-planner', icon: '\u{1F9ED}', title: 'Mission Planner / Engineer', description: 'Compare launch vehicles, calculate costs, track orbits' },
  { id: 'executive', icon: '\u{1F4CA}', title: 'CEO / Executive', description: 'Market intelligence, competitive landscape, industry trends' },
  { id: 'supply-chain', icon: '\u{1F517}', title: 'Supply Chain Professional', description: 'Map suppliers, track resources, procurement intelligence' },
  { id: 'legal', icon: '\u2696\uFE0F', title: 'Legal / Compliance', description: 'Space treaties, FCC/FAA filings, ITAR/EAR export controls' },
];

interface TourStep {
  title: string;
  description: string;
  icon: string;
  highlights: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Real-Time Space Intelligence',
    description: 'SpaceNexus aggregates data from 100+ sources including NASA, NOAA, SpaceTrack, and industry RSS feeds. All updated continuously.',
    icon: '\u{1F4E1}',
    highlights: ['Live satellite tracking', 'Solar weather alerts', 'Launch schedules', 'News aggregation'],
  },
  {
    title: '30+ Interactive Modules',
    description: 'From mission cost calculators to market sizing tools, everything you need is organized into easy-to-navigate modules.',
    icon: '\u{1F6E0}\uFE0F',
    highlights: ['Mission Cost Calculator', 'Market Sizing (TAM/SAM/SOM)', 'Grant Aggregator', 'AI Investment Thesis'],
  },
  {
    title: 'Customize Your Experience',
    description: 'Use the Module Configurator to enable only the modules you need. Your preferences are saved automatically.',
    icon: '\u2699\uFE0F',
    highlights: ['Toggle modules on/off', 'Reorder your dashboard', 'Keyboard shortcuts (? for help)', 'Quick search (Ctrl+K)'],
  },
];

export function getUserPersona(): UserPersona | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PERSONA_KEY) as UserPersona | null;
}

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0); // 0 = persona selection, 1-3 = tour steps
  const [selectedPersona, setSelectedPersona] = useState<UserPersona | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (selectedPersona) {
      localStorage.setItem(PERSONA_KEY, selectedPersona);
    }
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    // Notify other components that persona was set
    window.dispatchEvent(new Event('persona-changed'));
  }, [selectedPersona]);

  const handleNext = useCallback(() => {
    if (step === 0 && !selectedPersona) return; // Must select persona
    if (step < TOUR_STEPS.length) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  }, [step, selectedPersona, handleComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handleBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handleBack, handleSkip]);

  if (!isOpen) return null;

  const totalSteps = TOUR_STEPS.length + 1; // persona step + tour steps
  const isPersonaStep = step === 0;
  const tourStep = isPersonaStep ? null : TOUR_STEPS[step - 1];

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to SpaceNexus"
        className="relative bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-lg font-bold text-white">
              {isPersonaStep ? 'Welcome to SpaceNexus' : tourStep?.title}
            </h2>
            <p className="text-sm text-slate-400">
              Step {step + 1} of {totalSteps}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-white transition-colors p-1 text-sm"
            aria-label="Skip tour"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          {isPersonaStep ? (
            <>
              <p className="text-slate-300 mb-5">
                Tell us about yourself so we can personalize your experience. Select the role that best describes you:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERSONAS.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona.id)}
                    className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                      selectedPersona === persona.id
                        ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{persona.icon}</span>
                      <div>
                        <div className={`font-semibold text-sm ${selectedPersona === persona.id ? 'text-cyan-300' : 'text-white'}`}>
                          {persona.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{persona.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : tourStep ? (
            <>
              <div className="text-center mb-6">
                <span className="text-5xl">{tourStep.icon}</span>
              </div>
              <p className="text-slate-300 text-center mb-6">{tourStep.description}</p>
              <div className="grid grid-cols-2 gap-2">
                {tourStep.highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40"
                  >
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-300">{highlight}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 py-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 h-2 bg-cyan-400'
                  : i < step
                    ? 'w-2 h-2 bg-cyan-600'
                    : 'w-2 h-2 bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium px-4 py-2"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            disabled={isPersonaStep && !selectedPersona}
            className={`font-medium py-2.5 px-6 rounded-lg transition-all text-sm ${
              isPersonaStep && !selectedPersona
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : step === TOUR_STEPS.length
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg'
                  : 'bg-nebula-500 hover:bg-nebula-600 text-white'
            }`}
          >
            {step === TOUR_STEPS.length ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
