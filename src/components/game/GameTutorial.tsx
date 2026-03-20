'use client';

import { useState, useEffect } from 'react';
import { playSound } from '@/lib/game/sound-engine';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  action: string; // What player should do
  tab?: string; // Which tab to highlight
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome, Commander!',
    description: 'You\'re the CEO of a new space company with $500M in funding. Let\'s build your first infrastructure.',
    icon: '🚀',
    action: 'Click "Next" to begin',
  },
  {
    title: 'Build Your First Facility',
    description: 'Go to the Build tab and select "Earth Surface". Build a Ground Station — it\'s the cheapest and fastest building. It will generate revenue once complete.',
    icon: '🏗️',
    action: 'Build a Ground Station ($30M, 3 min)',
    tab: 'build',
  },
  {
    title: 'Wait for Construction',
    description: 'Your building is under construction! Check the Dashboard to see the countdown timer. Once it completes, a service activates automatically and revenue starts flowing.',
    icon: '⏱️',
    action: 'Watch the Dashboard for completion',
    tab: 'dashboard',
  },
  {
    title: 'Start Research',
    description: 'Go to the Research tab. Start researching "Triple-Junction Solar Cells" or "High-Res Optical" — both are cheap and unlock new buildings.',
    icon: '🔬',
    action: 'Start any Tier 1 research',
    tab: 'research',
  },
  {
    title: 'Explore the Solar System',
    description: 'The Map tab shows the solar system. You start with Earth Surface and LEO unlocked. As you research and earn money, you can unlock the Moon, Mars, and beyond!',
    icon: '🗺️',
    action: 'Check out the Map',
    tab: 'map',
  },
  {
    title: 'You\'re Ready!',
    description: 'Build more facilities, research technologies, mine resources, and expand across the solar system. More tabs will unlock as you progress. Check the FAQ if you need help. Good luck, Commander!',
    icon: '⭐',
    action: 'Start building your empire!',
  },
];

const STORAGE_KEY = 'spacetycoon_tutorial_complete';

interface GameTutorialProps {
  onSetTab?: (tab: string) => void;
}

export default function GameTutorial({ onSetTab }: GameTutorialProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
      // Show tutorial after a brief delay
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleNext = () => {
    playSound('click');
    if (step + 1 >= TUTORIAL_STEPS.length) {
      // Tutorial complete
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
      setVisible(false);
      return;
    }
    const nextStep = TUTORIAL_STEPS[step + 1];
    if (nextStep.tab && onSetTab) onSetTab(nextStep.tab);
    setStep(step + 1);
  };

  const handleSkip = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  const currentStep = TUTORIAL_STEPS[step];
  const isLast = step + 1 >= TUTORIAL_STEPS.length;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-reveal-up">
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50" style={{ background: 'linear-gradient(180deg, #0f1530 0%, #0a0a1a 100%)' }}>
        {/* Progress bar */}
        <div className="h-1 bg-white/[0.06]">
          <div
            className="h-1 bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
            style={{ width: `${((step + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-4">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[10px]">Step {step + 1} of {TUTORIAL_STEPS.length}</span>
            <button onClick={handleSkip} className="text-slate-600 text-[10px] hover:text-slate-400 transition-colors">
              Skip tutorial
            </button>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl shrink-0">{currentStep.icon}</span>
            <div>
              <h3 className="text-white text-sm font-semibold mb-1">{currentStep.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{currentStep.description}</p>
            </div>
          </div>

          {/* Action hint */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-cyan-400 text-xs font-medium">{currentStep.action}</p>
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            className="w-full py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg transition-all"
          >
            {isLast ? 'Start Playing!' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
