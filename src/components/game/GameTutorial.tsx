'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '@/lib/game/sound-engine';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  action: string;
  tab?: string;
  tip?: string;
  phase?: 'early' | 'mid' | 'late'; // Game phase this step belongs to
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // ─── PHASE 1: First 10 Minutes (Early Game) ─────────────────────────
  {
    title: 'Welcome, Commander!',
    description: 'You\'re the CEO of a new space company with $100M in starting capital. Your goal: build infrastructure, generate revenue, research technologies, and expand across the solar system. This is a multiplayer game — other players are building right now.',
    icon: '🚀',
    action: 'Click "Next" to learn the basics',
    tip: 'Check the Leaderboard tab later to see how you stack up against other players globally.',
    phase: 'early',
  },
  {
    title: 'Build Your First Facility',
    description: 'Go to the Build tab. You start with Earth Surface and LEO unlocked. Build a Ground Station ($30M, 3 min) — it\'s the cheapest and fastest building, earning $1.4M/month net profit as soon as it completes.',
    icon: '🏗️',
    action: 'Build a Ground Station on Earth Surface',
    tab: 'build',
    tip: 'Click "Why build this?" on any building card to see exactly how much money it makes and when to build it.',
    phase: 'early',
  },
  {
    title: 'Track Your Progress',
    description: 'Your building is now under construction! Go to the Dashboard tab to see it. The Dashboard shows everything at a glance: construction countdowns, active research timers, your income breakdown, net worth, and the Empire Overview bar showing how far across the solar system you\'ve expanded.',
    icon: '📊',
    action: 'Switch to the Dashboard to watch your building progress',
    tab: 'dashboard',
    tip: 'The Dashboard is your command center. Check it often — it shows revenue/costs, speed boosts you can activate, active effects, and your event log.',
    phase: 'early',
  },
  {
    title: 'Stack Your Income (Construction Limit)',
    description: 'Important: You can only have 2 construction projects running at the same time to start. You\'ll see a "Construction Queues" bar at the top of the Build tab showing your slots. Build a Small Launch Pad ($50M) as your second slot. Once either build finishes, queue up LEO Telecom Satellites ($15M each) — they earn $2.3M/month and are cheap and fast.',
    icon: '💰',
    action: 'Build a Small Launch Pad (your 2nd slot), then satellites after a slot opens',
    tab: 'build',
    tip: 'You start with 2 construction slots. Research "Orbital Assembly", "Space Dock", and "3D Printing in Space" to unlock up to 5 slots total. If all slots are full, build buttons are disabled — wait for a build to finish, then queue the next one.',
    phase: 'early',
  },
  {
    title: 'How Services Work',
    description: 'When a building completes, it automatically activates a revenue service (if you have the required research). The Services tab shows all your active income streams. Each service has revenue, operating costs, and net profit.',
    icon: '💼',
    action: 'Check the Services tab after your first building completes',
    tab: 'services',
    tip: 'The Dashboard "Income Breakdown" panel shows your total revenue including workforce bonuses, research bonuses, and market supply effects.',
    phase: 'early',
  },
  {
    title: 'Earn Cash from Contracts',
    description: 'Once you have 2 completed buildings, the Contracts tab unlocks. Go there now and look for "Launch Provider Certification" — it requires 2 active services, which you should already have from your Ground Station and Launch Pad. Accept it! When completed, it awards $60M cash — a huge boost toward your first research.',
    icon: '📋',
    action: 'Open Contracts tab → Accept "Launch Provider Certification"',
    tab: 'contracts',
    tip: 'You can have multiple contracts active at the same time, so accept every contract you qualify for. Check back often — new contracts appear as you progress. Contracts also reward speed boosts that accelerate construction and research.',
    phase: 'early',
  },
  {
    title: 'Start Research',
    description: 'Now go to the Research tab. With your $60M contract reward, you\'re closer to affording research. Open the "Rocketry" category dropdown and look for "Reusable Boosters" ($200M) — it unlocks the Medium Launch Pad and Moon access. Research is expensive, so you may need to wait for more revenue. Check the suggested researches at the top for affordable options.',
    icon: '🔬',
    action: 'Open Rocketry category → Start "Reusable Boosters" when you can afford it',
    tab: 'research',
    tip: 'Research is organized into categories (Rocketry, Mining, Spacecraft, etc.). Click any category to expand it. If you can\'t afford Reusable Boosters yet, try cheaper researches like Triple Junction ($60M) or High-Res Optical ($100M) — they unlock new buildings too.',
    phase: 'early',
  },
  {
    title: 'Explore the Solar System',
    description: 'The Map tab shows all locations from Earth to the Outer System. Each requires research and money to unlock. Unlock GEO orbit first ($50M, no research) for premium telecom satellites earning $5.5M/month net each.',
    icon: '🗺️',
    action: 'Unlock GEO orbit and build a GEO Telecom Satellite',
    tab: 'map',
    tip: 'Each location has unique buildings and resources. The Moon has water ice, Mars has iron/aluminum, and the Asteroid Belt has precious metals.',
    phase: 'early',
  },

  // ─── PHASE 2: 10-30 Minutes (Mid Game) ──────────────────────────────
  {
    title: 'Hire Your Crew',
    description: 'After 3 buildings, the Crew tab unlocks. Hire Operators — each one boosts ALL service revenue by +10%. At $10M+ monthly revenue, Operators earn more than their $450K/month salary. Scientists speed up research by 15%.',
    icon: '👷',
    action: 'Hire 1-2 Operators, then a Scientist',
    tab: 'workforce',
    tip: 'Miners boost resource production by 20% each. Hire them when you start mining on the Moon.',
    phase: 'mid',
  },
  {
    title: 'Start Mining Resources',
    description: 'Research "Resource Prospecting" to unlock Lunar Ice Mining. Unlock the Lunar Surface ($2B) and build a mine there. Mining produces resources (water, iron, titanium) you need for advanced buildings — and unlocks the Market tab.',
    icon: '⛏️',
    action: 'Work toward Lunar Surface mining operations',
    tip: 'Once you have resources, hover over red resource costs on buildings to see exactly how to get what you need.',
    phase: 'mid',
  },
  {
    title: 'Build Your Fleet',
    description: 'The Fleet tab lets you build ships. Mining Drones ($15M) extract iron/aluminum at 8 units/minute. Survey Probes ($25M, single-use) discover hidden bonuses worth $10M-$1B at any location. Cargo Shuttles move resources between locations.',
    icon: '🚢',
    action: 'Build Mining Drones for resources, Survey Probes for bonuses',
    tab: 'fleet',
    tip: 'To START mining: select an idle mining ship → choose a resource → it mines automatically. To TRANSPORT: select a ship → pick a destination.',
    phase: 'mid',
  },
  {
    title: 'Complete Contracts',
    description: 'The Contracts tab (unlocks at 2 buildings) offers goals that reward money AND speed boosts. Speed boosts accelerate construction or research by 1.5-3x for a limited time. Accept contracts you\'re close to completing.',
    icon: '📋',
    action: 'Accept contracts and check which you\'re close to finishing',
    tab: 'contracts',
    tip: 'Speed boosts appear on the Dashboard. Activate them BEFORE starting expensive builds or research to save hours of wait time.',
    phase: 'mid',
  },
  {
    title: 'Trade on the Market',
    description: 'Once you have resources, the Market tab opens. Prices are dynamic and multiplayer — they change based on supply and demand across ALL players. Sell excess resources for cash, or buy what you need for construction.',
    icon: '📈',
    action: 'Sell some resources you don\'t need, buy what you do',
    tab: 'market',
    tip: 'Market events randomly change prices for specific resources. Buy low during crashes, sell high during shortages. Watch the event log for announcements.',
    phase: 'mid',
  },

  // ─── PHASE 3: 30+ Minutes (Late Game) ───────────────────────────────
  {
    title: 'Crafting & Production Chains',
    description: 'Build an Orbital Fabrication Lab (requires "Orbital Assembly" research) to unlock the Crafting tab. Here you refine raw resources into higher-value products: steel ingots, electronics, solar panels, and station modules.',
    icon: '🔨',
    action: 'Build a Fabrication Lab → open the Crafting tab',
    tab: 'crafting',
    tip: 'Crafted products are needed for advanced construction. The production chain goes: raw ore → processed material → component → finished product.',
    phase: 'late',
  },
  {
    title: 'Join or Create an Alliance',
    description: 'After 5 buildings, the Alliance tab unlocks. Join an existing alliance or create your own. Alliance members share bonuses: +5% revenue per member (max +25%), plus mining and research speed boosts.',
    icon: '🤝',
    action: 'Join an alliance or create one with a name and 3-5 character tag',
    tab: 'alliance',
    tip: 'Alliance bonuses stack on top of your workforce and research bonuses. A full 5-member alliance gives +25% revenue, +12.5% mining, and +7.5% research.',
    phase: 'late',
  },
  {
    title: 'Post and Fill Bounties',
    description: 'The Bounties tab (unlocks with resources) is a player-to-player trading board. Post a bounty for resources you need — your money goes into escrow. Other players fulfill bounties to earn your posted price. Great for getting rare resources.',
    icon: '📦',
    action: 'Post a bounty for a resource you need, or fill one that\'s posted',
    tab: 'bounties',
    tip: 'Bounties have a time limit. If no one fills your bounty before it expires, your escrowed money is returned automatically.',
    phase: 'late',
  },
  {
    title: 'Competitive Multiplayer Contracts',
    description: 'Beyond regular contracts, there are competitive contracts with limited winner slots. The first players to complete them win exclusive titles and massive rewards. Check the Contracts tab for "competitive" entries — they\'re races against other players.',
    icon: '🏆',
    action: 'Look for competitive contracts and race to complete them',
    tab: 'contracts',
    tip: 'Top rewards: "Titan Baron" title ($8B), "Jovian Pioneer" ($5B), "Antimatter Sovereign" ($20B). Only 1-5 players can win each.',
    phase: 'late',
  },
  {
    title: 'Prestige & New Game+',
    description: 'Once you\'ve expanded far enough (5+ locations, 20+ research), you can Prestige. This resets your game but gives PERMANENT bonuses: higher revenue, faster building, faster research, better mining, and more starting money. Each prestige level stacks.',
    icon: '⭐',
    action: 'Look for the ⭐ Prestige button when you\'re ready for a fresh start',
    tip: 'Don\'t prestige too early — the bonuses compound, so reaching further before prestiging gives better returns. Aim for Asteroid Belt access minimum.',
    phase: 'late',
  },
  {
    title: 'You\'re a Space Tycoon!',
    description: 'You now know every system in the game. Build infrastructure, research tech, mine resources, trade on the market, craft products, join alliances, complete contracts, and expand to the Outer System. Your ultimate goal: reach the Kuiper Belt with fusion technology.',
    icon: '🌌',
    action: 'Go build your space empire!',
    tip: 'Top revenue buildings to aim for: Titan Harvester ($105M/mo net), Europa Drill ($75M/mo), Mars Habitat ($45M/mo). Good luck, Commander!',
    phase: 'late',
  },
];

const STORAGE_KEY = 'spacetycoon_tutorial_complete';
const TUTORIAL_STEP_KEY = 'spacetycoon_tutorial_step';

interface GameTutorialProps {
  onSetTab?: (tab: string) => void;
}

export default function GameTutorial({ onSetTab }: GameTutorialProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  // Drag state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from the header area
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    isDragging.current = true;
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const x = e.clientX - dragOffset.current.x;
    const y = e.clientY - dragOffset.current.y;
    // Clamp to viewport
    const maxX = window.innerWidth - (dragRef.current?.offsetWidth || 420);
    const maxY = window.innerHeight - (dragRef.current?.offsetHeight || 300);
    setPosition({
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
      const savedStep = localStorage.getItem(TUTORIAL_STEP_KEY);
      if (savedStep) setStep(parseInt(savedStep, 10) || 0);
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    } catch {}
  }, []);

  const handleNext = () => {
    playSound('click');
    if (step + 1 >= TUTORIAL_STEPS.length) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
        localStorage.removeItem(TUTORIAL_STEP_KEY);
      } catch {}
      setVisible(false);
      return;
    }
    const nextStep = step + 1;
    const nextDef = TUTORIAL_STEPS[nextStep];
    if (nextDef.tab && onSetTab) onSetTab(nextDef.tab);
    setStep(nextStep);
    try { localStorage.setItem(TUTORIAL_STEP_KEY, String(nextStep)); } catch {}
  };

  const handleBack = () => {
    if (step > 0) {
      playSound('click');
      const prevStep = step - 1;
      const prevDef = TUTORIAL_STEPS[prevStep];
      if (prevDef.tab && onSetTab) onSetTab(prevDef.tab);
      setStep(prevStep);
      try { localStorage.setItem(TUTORIAL_STEP_KEY, String(prevStep)); } catch {}
    }
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.removeItem(TUTORIAL_STEP_KEY);
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  const currentStep = TUTORIAL_STEPS[step];
  const isLast = step + 1 >= TUTORIAL_STEPS.length;
  const isFirst = step === 0;

  const phaseLabels = { early: 'Getting Started', mid: 'Growing Your Empire', late: 'Advanced Systems' };
  const phaseColors = { early: '#2DCCFF', mid: '#56F000', late: '#FFB302' };

  return (
    <div
      ref={dragRef}
      className={`fixed z-50 ${position ? '' : 'bottom-20 left-4 right-4 md:left-auto md:right-4'} md:w-[420px] ${!position ? 'animate-reveal-up' : ''}`}
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      <div className="card-terminal shadow-2xl shadow-black/60">
        {/* Terminal chrome — draggable handle */}
        <div
          className="card-terminal__header cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="flex items-center gap-2">
            <div className="card-terminal__dots">
              <div className="card-terminal__dot card-terminal__dot--red" />
              <div className="card-terminal__dot card-terminal__dot--amber" />
              <div className="card-terminal__dot card-terminal__dot--green" />
            </div>
            <span className="card-terminal__path">spacenexus:~/tutorial</span>
          </div>
          <button onClick={handleSkip} className="text-[9px] uppercase tracking-wider hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
            Skip All
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1" style={{ background: 'var(--border-subtle)' }}>
          <div
            className="h-1 transition-all duration-300"
            style={{ width: `${((step + 1) / TUTORIAL_STEPS.length) * 100}%`, background: phaseColors[currentStep.phase || 'early'] }}
          />
        </div>

        <div className="p-4">
          {/* Phase + step counter */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${phaseColors[currentStep.phase || 'early']}15`, color: phaseColors[currentStep.phase || 'early'] }}>
                {phaseLabels[currentStep.phase || 'early']}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {step + 1}/{TUTORIAL_STEPS.length}
              </span>
            </div>
            {currentStep.tab && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-hover)' }}>
                {currentStep.tab}
              </span>
            )}
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
            <p className="text-xs font-medium" style={{ color: '#818cf8' }}>
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

          {/* Navigation */}
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
              style={{ background: phaseColors[currentStep.phase || 'early'] === '#2DCCFF' ? 'var(--accent-primary)' : phaseColors[currentStep.phase || 'early'] }}
            >
              {isLast ? '🌌 Start Playing!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
