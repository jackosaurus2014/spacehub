'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { clientLogger } from '@/lib/client-logger';
import 'driver.js/dist/driver.css';

const TOUR_COMPLETED_KEY = 'spacenexus-tour-completed';
const TOUR_STARTED_KEY = 'spacenexus-tour-started';

interface TourStep {
  selector: string;
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="executive-center"]',
    title: 'Executive Command Center',
    description:
      'Your single pane of glass for the space industry. Briefings, funding, launches, and intel in one dashboard.',
  },
  {
    selector: '[data-tour="bd-pipeline"]',
    title: 'BD Pipeline',
    description:
      'Track your business development opportunities. Free tier includes 3 opportunities; Pro unlocks unlimited.',
  },
  {
    selector: '[data-tour="war-room"]',
    title: 'Competitive War Room',
    description:
      'Monitor competitors, win/loss trends, and strategic moves across the space industry.',
  },
  {
    selector: '[data-tour="dossiers"]',
    title: 'AI Company Dossiers',
    description:
      'Generate deep-dive Claude-powered briefings on any company in seconds.',
  },
  {
    selector: '[data-tour="company-profiles"]',
    title: 'Company Profiles',
    description:
      '232+ profiled space companies. Claim your company to manage your public presence (Pro+).',
  },
  {
    selector: '[data-tour="upgrade"]',
    title: 'Upgrade Anytime',
    description:
      'You have a 3-day Pro trial. Upgrade anytime to unlock the full platform.',
  },
];

export default function GuidedTour() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (typeof window === 'undefined') return;

    try {
      if (localStorage.getItem(TOUR_COMPLETED_KEY)) return;
      if (sessionStorage.getItem(TOUR_STARTED_KEY)) return;
      sessionStorage.setItem(TOUR_STARTED_KEY, '1');
    } catch {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const { driver } = await import('driver.js');

        const availableSteps = STEPS.filter((s) => {
          if (document.querySelector(s.selector)) return true;
          clientLogger.warn('GuidedTour: target element not found', { selector: s.selector });
          return false;
        });
        if (availableSteps.length === 0) return;

        driver({
          showProgress: true,
          allowClose: true,
          overlayColor: '#000',
          overlayOpacity: 0.75,
          popoverClass: 'spacenexus-tour-popover',
          nextBtnText: 'Next',
          prevBtnText: 'Back',
          doneBtnText: 'Done',
          onDestroyed: () => {
            try { localStorage.setItem(TOUR_COMPLETED_KEY, '1'); } catch { /* ignore */ }
          },
          steps: availableSteps.map((s) => ({
            element: s.selector,
            popover: { title: s.title, description: s.description, side: 'bottom', align: 'start' },
          })),
        }).drive();
      } catch (err) {
        clientLogger.warn('GuidedTour: failed to start', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status]);

  return null;
}
