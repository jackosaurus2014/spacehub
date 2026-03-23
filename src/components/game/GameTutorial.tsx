'use client';

import { useState, useEffect } from 'react';
import { playSound } from '@/lib/game/sound-engine';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  action: string;
  tab?: string;
  tip?: string; // Extra pro tip shown in a different color
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome, Commander!',
    description: 'You\'re the CEO of a new space company with $100M in starting capital. Your goal: build infrastructure, generate revenue, research technologies, and expand across the solar system.',
    icon: '🚀',
    action: 'Click "Next" to learn the basics',
    tip: 'This game is multiplayer — other players are building their empires right now. Check the Leaderboard to see how you stack up.',
  },
  {
    title: 'Step 1: Build Revenue Generators',
    description: 'Go to the Build tab. You start with Earth Surface and LEO unlocked. Build a Ground Station ($30M, 3 min) — it\'s the cheapest building and will start earning $1.4M/month net profit immediately.',
    icon: '🏗️',
    action: 'Build a Ground Station on Earth Surface',
    tab: 'build',
    tip: 'Click "Why build this?" on any building card to see exactly how much money it makes.',
  },
  {
    title: 'Step 2: Stack Your Income',
    description: 'While your Ground Station builds, add a Small Launch Pad ($50M, 5 min). It earns $2.5M/month net — your biggest early moneymaker. Then build LEO Telecom Satellites ($15M each) for more revenue streams.',
    icon: '💰',
    action: 'Build a Small Launch Pad + 2-3 LEO Telecom Satellites',
    tab: 'build',
    tip: 'Each building type gets more expensive if you build duplicates at the same location (1.15x scaling).',
  },
  {
    title: 'Step 3: Start Research',
    description: 'Go to the Research tab. Research "Reusable Boosters" first — it unlocks the Medium Launch Pad ($11M/month net!) and is required for Moon access. Cards with a purple "READY" badge can be started immediately.',
    icon: '🔬',
    action: 'Start researching Reusable Boosters',
    tab: 'research',
    tip: 'Amber "NEED $" cards are unlocked but you can\'t afford them yet. They show exactly how much more money you need.',
  },
  {
    title: 'Step 4: Explore the Solar System',
    description: 'The Map tab shows all locations you can expand to. Each location requires research and money to unlock, and has unique buildings. The Moon has ice mining, Mars has metals, and the Asteroid Belt has precious metals.',
    icon: '🗺️',
    action: 'Check the Map to see what\'s available',
    tab: 'map',
    tip: 'Unlock GEO orbit ($50M, no research needed) for GEO Telecom Satellites that earn $5.5M/month net each.',
  },
  {
    title: 'Step 5: Hire Your Crew',
    description: 'Once you have 3+ buildings, the Crew tab unlocks. Hire Operators — they boost ALL service revenue by +10% each. At $10M+ monthly revenue, each Operator earns more than their salary.',
    icon: '👷',
    action: 'Hire 1-2 Operators when the Crew tab appears',
    tip: 'The Dashboard now shows a full income breakdown including workforce bonuses and research effects.',
  },
  {
    title: 'Step 6: Start Mining',
    description: 'Research "Resource Prospecting" to unlock Lunar Ice Mining. Unlock the Lunar Surface ($2B) and build a mine there. Mining produces resources you need for advanced buildings — and unlocks the Market tab where you can trade them.',
    icon: '⛏️',
    action: 'Work toward Lunar Surface access',
    tip: 'Resources like aluminum and titanium are required to build space stations and advanced structures.',
  },
  {
    title: 'Step 7: Build Your Fleet',
    description: 'The Fleet tab unlocks after your first research. Build Mining Drones ($15M) to mine iron and aluminum — the two resources you need for almost everything. Survey Probes ($25M) discover hidden bonuses at any location.',
    icon: '🚢',
    action: 'Build Mining Drones and Survey Probes',
    tab: 'fleet',
    tip: 'Click "Why build this?" on any ship to see its ROI. Mining Drones generate $40-64K/minute in resources.',
  },
  {
    title: 'Step 8: Complete Contracts',
    description: 'The Contracts tab appears after 2 buildings. Contracts reward you with money AND speed boosts that accelerate construction or research. Check which contracts you\'re close to completing.',
    icon: '📋',
    action: 'Accept and complete contracts for bonuses',
    tip: 'Speed boosts from contracts stack! Activate them from the Dashboard before starting expensive builds.',
  },
  {
    title: 'You\'re Ready, Commander!',
    description: 'You know the basics. Build infrastructure, research tech, mine resources, complete contracts, and expand across the solar system. Your ultimate goal: reach the Outer System with fusion drive technology.',
    icon: '⭐',
    action: 'Go build your space empire!',
    tip: 'Top revenue buildings: Titan Hydrocarbon Harvester ($105M/month net), Europa Ice Drill ($75M/month net), Mars Habitat ($45M/month net).',
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
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    } catch {}
  }, []);

  const handleNext = () => {
    playSound('click');
    if (step + 1 >= TUTORIAL_STEPS.length) {
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
      setVisible(false);
      return;
    }
    const nextStep = TUTORIAL_STEPS[step + 1];
    if (nextStep.tab && onSetTab) onSetTab(nextStep.tab);
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      playSound('click');
      const prevStep = TUTORIAL_STEPS[step - 1];
      if (prevStep.tab && onSetTab) onSetTab(prevStep.tab);
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  const currentStep = TUTORIAL_STEPS[step];
  const isLast = step + 1 >= TUTORIAL_STEPS.length;
  const isFirst = step === 0;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-[420px] z-50 animate-reveal-up">
      <div className="card-terminal shadow-2xl shadow-black/60">
        {/* Terminal chrome */}
        <div className="card-terminal__header">
          <div className="flex items-center gap-2">
            <div className="card-terminal__dots">
              <div className="card-terminal__dot card-terminal__dot--red" />
              <div className="card-terminal__dot card-terminal__dot--amber" />
              <div className="card-terminal__dot card-terminal__dot--green" />
            </div>
            <span className="card-terminal__path">spacenexus:~/tutorial</span>
          </div>
          <button onClick={handleSkip} className="text-[9px] uppercase tracking-wider hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
            Skip
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1" style={{ background: 'var(--border-subtle)' }}>
          <div
            className="h-1 transition-all duration-300"
            style={{ width: `${((step + 1) / TUTORIAL_STEPS.length) * 100}%`, background: 'var(--accent-primary)' }}
          />
        </div>

        <div className="p-4">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {step + 1}/{TUTORIAL_STEPS.length}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {currentStep.tab ? `Tab: ${currentStep.tab}` : 'Overview'}
            </span>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl shrink-0">{currentStep.icon}</span>
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{currentStep.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{currentStep.description}</p>
            </div>
          </div>

          {/* Action hint */}
          <div className="rounded px-3 py-2 mb-2" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--accent-primary-bright, #818cf8)' }}>
              → {currentStep.action}
            </p>
          </div>

          {/* Pro tip */}
          {currentStep.tip && (
            <div className="rounded px-3 py-2 mb-3" style={{ background: 'rgba(86, 240, 0, 0.05)', border: '1px solid rgba(86, 240, 0, 0.1)' }}>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                <span style={{ color: '#56F000' }} className="font-semibold">TIP:</span> {currentStep.tip}
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={handleBack}
                className="flex-1 py-2 text-xs font-medium rounded transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-2 text-xs font-semibold text-white rounded transition-all"
              style={{ background: 'var(--accent-primary)' }}
            >
              {isLast ? '🎮 Start Playing!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
