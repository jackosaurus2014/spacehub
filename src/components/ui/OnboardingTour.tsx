'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { setPersona } from '@/lib/user-preferences';
import type { Persona } from '@/lib/user-preferences';
import { PERSONA_MODULE_PRESETS, saveHomeModulePreset } from '@/lib/module-presets';
import { toast } from '@/lib/toast';
import GameIcon from '@/components/game/GameIcon';
import type { IconName } from '@/lib/game/icons';

const STORAGE_KEY = 'spacenexus-onboarding-complete';
const PERSONA_KEY = 'spacenexus-user-persona';

export type UserPersona = 'enthusiast' | 'investor' | 'entrepreneur' | 'mission-planner' | 'executive' | 'supply-chain' | 'legal';

/**
 * Map the tour's six role personas onto the site's three preference personas
 * (spacenexus_prefs + homepage module presets) so both pickers agree.
 */
const SITE_PERSONA_MAP: Record<UserPersona, Persona> = {
  enthusiast: 'enthusiast',
  investor: 'investor',
  executive: 'investor',
  entrepreneur: 'professional',
  'supply-chain': 'professional',
  'mission-planner': 'professional',
  legal: 'professional',
};

const PERSONAS: { id: UserPersona; icon: string; title: string; description: string }[] = [
  // First card on purpose (2026-08-29): enthusiasts are the stated priority and the audience search sends.
  { id: 'enthusiast', icon: 'map', title: 'Space Fan', description: 'Watch launches live, track the ISS over your house, follow every rocket, play Space Tycoon' },
  { id: 'investor', icon: 'market', title: 'Investor / VC', description: 'Evaluate deals, track funding rounds, follow market trends' },
  { id: 'entrepreneur', icon: 'contracts', title: 'Entrepreneur / Founder', description: 'Find grants, build business models, discover customers' },
  { id: 'mission-planner', icon: 'research', title: 'Mission Planner / Engineer', description: 'Compare launch vehicles, calculate costs, track orbits' },
  { id: 'executive', icon: 'reports', title: 'CEO / Executive', description: 'Market intelligence, competitive landscape, industry trends' },
  { id: 'supply-chain', icon: 'services', title: 'Supply Chain Professional', description: 'Map suppliers, track resources, procurement intelligence' },
  { id: 'legal', icon: 'governance', title: 'Legal / Compliance', description: 'Space treaties, FCC/FAA filings, ITAR/EAR export controls' },
];

// Map persona to a starting destination so the tour ends with a clear next step
const PERSONA_DESTINATIONS: Record<UserPersona, { href: string; label: string }> = {
  enthusiast: { href: '/mission-control', label: 'Open Mission Control' },
  investor: { href: '/market-intel', label: 'Open Market Intelligence' },
  entrepreneur: { href: '/procurement?tab=grants', label: 'Browse Funding Opportunities' },
  'mission-planner': { href: '/tools', label: 'Explore Engineering Tools' },
  executive: { href: '/mission-control', label: 'Open Mission Control' },
  'supply-chain': { href: '/supply-chain', label: 'View Supply Chain Map' },
  legal: { href: '/compliance', label: 'Open Regulatory Hub' },
};

/** Fire-and-forget POST to persist persona/onboarding state to the backend */
async function syncPersonaToServer(data: {
  persona?: string;
  onboardingStep?: number;
  onboardingCompleted?: boolean;
}): Promise<void> {
  try {
    await fetch('/api/auth/update-persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // Non-blocking: if the user isn't authenticated or the request fails, silently ignore
  }
}

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
    icon: 'dashboard',
    highlights: ['Live satellite tracking', 'Solar weather alerts', 'Launch schedules', 'News aggregation'],
  },
  {
    title: '30+ Interactive Modules',
    description: 'From mission cost calculators to market sizing tools, everything you need is organized into easy-to-navigate modules.',
    icon: 'modules',
    highlights: ['Mission Cost Calculator', 'Market Sizing (TAM/SAM/SOM)', 'Grant Aggregator', 'Deal Flow Database'],
  },
  {
    title: 'Customize Your Experience',
    description: 'Use the Module Configurator to enable only the modules you need. Your preferences are saved automatically.',
    icon: 'services',
    highlights: ['Toggle modules on/off', 'Reorder your dashboard', 'Keyboard shortcuts (? for help)', 'Quick search (Ctrl+K)'],
  },
];

export function getUserPersona(): UserPersona | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PERSONA_KEY) as UserPersona | null;
}

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0); // 0 = persona selection, 1-3 = tour steps
  const [selectedPersona, setSelectedPersona] = useState<UserPersona | null>(null);
  const syncedFromServer = useRef(false);

  // On mount: sync persona from server if user is authenticated and localStorage is empty
  useEffect(() => {
    if (syncedFromServer.current) return;
    syncedFromServer.current = true;

    const existingPersona = localStorage.getItem(PERSONA_KEY);
    if (!existingPersona) {
      fetch('/api/auth/update-persona')
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (data?.data?.persona) {
            localStorage.setItem(PERSONA_KEY, data.data.persona);
            window.dispatchEvent(new Event('persona-changed'));
          }
          if (data?.data?.onboardingCompleted) {
            localStorage.setItem(STORAGE_KEY, 'true');
          }
        })
        .catch(() => {
          // Not authenticated or network error — ignore
        });
    }
  }, []);

  useEffect(() => {
    // The game has its own first-touch flow (GameStartMenu); never stack this modal on it.
    if (pathname?.startsWith('/space-tycoon')) return;
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;
    // Overlay budget: one (SYNTHESIS.md §3). Never on the very first pageview
    // — the visitor came for a launch, and the cookie sheet is already up —
    // and never while consent is still pending. Second page of the session.
    let pageviews = 0;
    try {
      pageviews = parseInt(sessionStorage.getItem('sn:pv') || '0', 10) + 1;
      sessionStorage.setItem('sn:pv', String(pageviews));
    } catch { pageviews = 2; }
    const consented = !!localStorage.getItem('spacenexus-cookie-consent');
    if (pageviews < 2 || !consented) return;
    // Small delay so the page loads first
    const timer = setTimeout(() => setIsOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [, pathname]);

  const handleComplete = useCallback(() => {
    if (selectedPersona) {
      localStorage.setItem(PERSONA_KEY, selectedPersona);
      syncPersonaToServer({ persona: selectedPersona, onboardingCompleted: true });
      // Align the site-wide preference persona and the homepage module preset
      // with the mapped persona so this tour and the landing PersonaPicker agree
      const sitePersona = SITE_PERSONA_MAP[selectedPersona];
      setPersona(sitePersona);
      saveHomeModulePreset(PERSONA_MODULE_PRESETS[sitePersona], sitePersona);
    } else {
      syncPersonaToServer({ onboardingCompleted: true });
    }
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    // Notify other components that persona was set
    window.dispatchEvent(new Event('persona-changed'));
    // Stay in place so the freshly curated dashboard is visible; point the
    // user at their role's recommended destination instead of redirecting.
    if (selectedPersona && PERSONA_DESTINATIONS[selectedPersona]) {
      const dest = PERSONA_DESTINATIONS[selectedPersona];
      toast.success(
        `Your homepage is now curated for your role. When you're ready, head to ${dest.href} to ${dest.label.charAt(0).toLowerCase()}${dest.label.slice(1)}.`,
        'Welcome to SpaceNexus'
      );
    }
  }, [selectedPersona]);

  const handleNext = useCallback(() => {
    if (step === 0 && !selectedPersona) return; // Must select persona
    if (step < TOUR_STEPS.length) {
      const nextStep = step + 1;
      setStep(nextStep);
      // Persist step progress (and persona on step 0 -> 1 transition)
      if (step === 0 && selectedPersona) {
        localStorage.setItem(PERSONA_KEY, selectedPersona);
        syncPersonaToServer({ persona: selectedPersona, onboardingStep: nextStep });
      } else {
        syncPersonaToServer({ onboardingStep: nextStep });
      }
    } else {
      handleComplete();
    }
  }, [step, selectedPersona, handleComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    syncPersonaToServer({ onboardingCompleted: true });
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

  // Accessibility (2026-08-29): move focus into the dialog when it opens,
  // keep Tab inside it, and hide the page behind it from assistive tech.
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const main = document.querySelector('main');
    main?.setAttribute('inert', '');
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled'));
    (focusables()[0] ?? dialog).focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      main?.removeAttribute('inert');
      previouslyFocused?.focus?.();
    };
  }, [isOpen, step]);

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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to SpaceNexus"
        className="relative bg-black border border-white/[0.06] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white via-purple-500 to-pink-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
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
              <p className="text-white/70 mb-5">
                Tell us about yourself so we can personalize your experience. Select the role that best describes you:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERSONAS.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona.id)}
                    className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                      selectedPersona === persona.id
                        ? 'border-white/10 bg-white/5 shadow-lg shadow-black/5'
                        : 'border-white/[0.06] bg-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 text-cyan-300"><GameIcon name={persona.icon as IconName} size={22} /></span>
                      <div>
                        <div className={`font-semibold text-sm ${selectedPersona === persona.id ? 'text-white/90' : 'text-white'}`}>
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
                <span className="text-cyan-300"><GameIcon name={tourStep.icon as IconName} size={40} /></span>
              </div>
              <p className="text-white/70 text-center mb-6">{tourStep.description}</p>
              <div className="grid grid-cols-2 gap-2">
                {tourStep.highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06]"
                  >
                    <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-white/70">{highlight}</span>
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
                  ? 'w-6 h-2 bg-white'
                  : i < step
                    ? 'w-2 h-2 bg-white'
                    : 'w-2 h-2 bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
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
                ? 'bg-white/[0.08] text-slate-500 cursor-not-allowed'
                : step === TOUR_STEPS.length
                  ? 'bg-gradient-to-r from-white to-purple-500 hover:from-slate-300 hover:to-purple-400 text-white shadow-lg'
                  : 'bg-white hover:bg-slate-100 text-slate-900'
            }`}
          >
            {step === TOUR_STEPS.length ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
