'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';

interface TutorialStep {
  title: string;
  description: string;
  icon: IconName;
  action: string;
  tab?: string;
  tip?: string;
  phase?: 'early' | 'mid' | 'late'; // Game phase this step belongs to
}

// Simulated-newcomer audit (2026-08-16): this card deck no longer runs on a
// fresh save — the First-Hour Guide (TutorialOverlay + onboarding.ts) owns
// build/income/research/contract/market/expansion basics with real state
// detection. This deck now appears only AFTER the guide finishes (page.tsx
// gates on !isOnboardingActive) as the "what's next" handbook, and its copy
// was re-grounded against the current tier gates (corporation-tiers.ts):
// Fleet/Reports at Tier 2, Crew/Crafting/Science at Tier 3, Alliance/Bounties
// at Tier 4 — the old "unlocks after N buildings" claims predated tiers.
const TUTORIAL_STEPS: TutorialStep[] = [
  // ─── PHASE 1: After the First-Hour Guide ────────────────────────────
  {
    title: 'Guide Complete — What Now?',
    description: 'You\'ve got the core loop: build facilities, keep research running, accept contracts, trade the market. From here, progression is driven by Corporation Tiers — hit economic milestones and your company evolves, unlocking new systems each tier. This handbook tours what\'s ahead.',
    icon: 'fleet',
    action: 'Click "Next" to tour the systems you\'ll unlock',
    tip: 'Check Standings any time to see how you stack up against other players. Your Protected Frontier shields you from rivals and NPC piracy for your first weeks.',
    phase: 'early',
  },
  {
    title: 'Corporation Tiers — Your Progression Path',
    description: 'Tier 2 "Venture" needs $500M total earned, 5 buildings, 3 research, and 3 locations — it unlocks the Fleet, Reports, Modules, Discoveries, Specialize, and Predictions tabs plus a 3rd construction slot. Every later tier adds more slots, passive bonuses, and deeper systems. The Dashboard shows your progress toward the next tier.',
    icon: 'money',
    action: 'Check your tier progress on the Dashboard',
    tab: 'dashboard',
    tip: 'Construction slots grow with tier (2 → 14) and research: "Orbital Assembly", "Space Dock", and "3D Printing in Space" each add +1 on top of your tier base.',
    phase: 'early',
  },
  {
    title: 'Contracts & the Daily Budget',
    description: 'Accept every contract you\'re close to finishing — they pay lump sums AND speed boosts (1.5-3x construction/research for a limited time). One honest limit: contract payouts share a daily budget of 4 completions per rolling 24 hours (raise it with Space Logistics Network research, and again at Tier 5). A finished contract past the cap pays automatically once the window frees up.',
    icon: 'contracts',
    action: 'Keep 2-3 contracts running that match what you\'re already building',
    tab: 'contracts',
    tip: 'Activate speed boosts BEFORE starting expensive builds or research. Faction Delivery contracts (Tier 2) pay full spot value with no broker fee — the same daily budget covers both kinds.',
    phase: 'early',
  },
  {
    title: 'The Road to the Moon',
    description: 'Research "Reusable Boosters" ($200M) for the Medium Launch Pad, then bank toward Lunar Orbit ($1B) and Lunar Surface ($2B). The Basic Lunar Extractor ($250M, money-only, no research) is your bootstrap mine — it produces lunar water every game month before you own any metals.',
    icon: 'map',
    action: 'Research Reusable Boosters → unlock Lunar Orbit → Lunar Surface',
    tab: 'research',
    tip: 'Each location has unique buildings and resources: the Moon has water ice, Mars has iron/aluminum, the Belt has precious metals. Off-Earth buildings need power — pair mines with solar farms or reactors.',
    phase: 'early',
  },

  // ─── PHASE 2: Tier 2-3 systems ──────────────────────────────────────
  {
    title: 'Build Your Fleet (Tier 2)',
    description: 'The Fleet tab unlocks at Tier 2 "Venture". Mining Drones ($15M) extract resources automatically. Survey Probes ($25M, single-use) discover hidden bonuses worth $10M-$1B at any location. Cargo Shuttles freight resources between locations — Δv and fuel are real costs.',
    icon: 'fleet',
    action: 'At Tier 2: build Mining Drones for resources, Survey Probes for bonuses',
    tab: 'fleet',
    tip: 'To START mining: select an idle mining ship → choose a resource. To TRANSPORT: select a ship → pick a destination. Repeated freight routes earn a fuel discount over time.',
    phase: 'mid',
  },
  {
    title: 'Serious Mining (Lunar Ice Mine)',
    description: 'Research "Resource Prospecting" to unlock the full Lunar Ice Mine ($1.5B) — it needs 80 iron + 40 aluminum + 15 titanium, which you can buy on the Market. It produces 100 lunar water + 2 helium-3 per game month, and mining revenue tracks the live spot price of what you extract.',
    icon: 'bld-mining',
    action: 'Buy the metals on the Market, then build the Lunar Ice Mine',
    tab: 'market',
    tip: 'Prices move with real supply and demand — buy inputs during crashes. Mass-extracting a commodity depresses its price for everyone, including you.',
    phase: 'mid',
  },
  {
    title: 'Hire Your Crew (Tier 3)',
    description: 'The Crew tab unlocks at Tier 3 "Enterprise". Operators boost ALL service revenue +10% each; Scientists speed research; Miners boost extraction +20% each; Engineers cut maintenance. Salaries scale with a server-wide wage index, so crew is a real monthly cost against a real bonus.',
    icon: 'workforce',
    action: 'At Tier 3: hire Operators first, then a Scientist',
    tab: 'workforce',
    tip: 'Watch morale and fatigue — an overworked, undersupplied crew erodes your bonuses. Training programs (Programs panel) certify crew for permanent gains.',
    phase: 'mid',
  },
  {
    title: 'Crafting & Production Chains',
    description: 'Build an Orbital Fabrication Lab ($600M, requires "Orbital Assembly" research) to open the Crafting tab immediately — no tier wait. Refine raw ore into steel ingots, electronics, solar panels, and station modules; crafted goods sell on the market and feed advanced construction.',
    icon: 'crafting',
    action: 'Build a Fabrication Lab → open the Crafting tab',
    tab: 'crafting',
    tip: 'The chain goes raw ore → processed material → component → finished product. Every extra fab facility speeds all crafting +15%.',
    phase: 'mid',
  },
  {
    title: 'Supply Lines — Buildings Eat Inputs',
    description: 'Once your Protected Frontier ends, completed buildings consume real monthly inputs: launch pads burn rocket fuel, satellites need spares, stations need life-support packs. Shortfalls brown a facility out toward 50% efficiency (never a hard stop). The Supply Lines strip on the Dashboard shows coverage.',
    icon: 'services',
    action: 'Watch the Supply Lines strip — stock inputs or set standing market orders',
    tab: 'dashboard',
    tip: 'Three ways to cover a recipe: produce inputs yourself (propellant plants, agri domes), freight them in, or set the building to a standing market order (auto-buys at spot +2% fee).',
    phase: 'mid',
  },

  // ─── PHASE 3: Tier 4+ systems ───────────────────────────────────────
  {
    title: 'Alliances & Bounties (Tier 4)',
    description: 'At Tier 4 "Corporation" the Alliance and Bounties tabs unlock. Alliance members share bonuses (+5% revenue per member, max +25%, plus mining/research boosts). Bounties are a player-to-player trading board with escrowed payouts — post for resources you need, fill others\' for profit.',
    icon: 'alliance',
    action: 'At Tier 4: join or create an alliance, and try the bounty board',
    tab: 'alliance',
    tip: 'Bounty escrow returns automatically if unfilled at expiry. Alliance bonuses stack on top of workforce and research bonuses.',
    phase: 'late',
  },
  {
    title: 'Competitive Contracts & Races',
    description: 'Competitive contracts have limited winner slots — the first players to finish win exclusive titles and massive rewards ("Titan Baron" $8B, "Jovian Pioneer" $5B, "Antimatter Sovereign" $20B). Location milestones (first station at Ceres, etc.) are also first-come races against every other player.',
    icon: 'leaderboard',
    action: 'Watch the Contracts tab and Dashboard world feed for open races',
    tab: 'contracts',
    tip: 'Only 1-5 players can win each competitive contract. Pick races that match infrastructure you were building anyway.',
    phase: 'late',
  },
  {
    title: 'Legacy & Permanent Progression',
    description: 'Buildings, research, contracts, and ships all feed Legacy milestones — permanent revenue, build-speed, research-speed, mining, and crew-capacity bonuses that never reset. Legacy Power gates the deepest endgame (Tier 6-7, Speed Runs, the Interstellar era).',
    icon: 'medal',
    action: 'Check Legacy progress from the Dashboard as your corporation grows',
    tip: 'Legacy bonuses stack forever. Corporate Eras (Tier 3+) add 90-day charters with permanent medals — long-horizon bets that compound.',
    phase: 'late',
  },
  {
    title: 'The Long Game',
    description: 'Mid-game is the solar system: Mars, the Belt, the outer planets, megaprojects, and economic rivalry with other corporations — always economic, never combat. End-game goes interstellar: expeditions beyond the heliopause, colonies, and trade routes. It\'s all earned — no purchase shortcuts exist.',
    icon: 'interstellar',
    action: 'Go build your space empire!',
    tip: 'Top revenue targets to aim toward: Titan Harvester ($105M/mo net), Europa Drill ($75M/mo), Mars Orbital Station ($30M/mo). Good luck, Commander!',
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
          <button onClick={handleSkip} className="min-h-[44px] px-2 text-[10px] uppercase tracking-wider hover:text-white transition-colors" style={{ color: 'var(--text-muted)' }}>
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
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${phaseColors[currentStep.phase || 'early']}15`, color: phaseColors[currentStep.phase || 'early'] }}>
                {phaseLabels[currentStep.phase || 'early']}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {step + 1}/{TUTORIAL_STEPS.length}
              </span>
            </div>
            {currentStep.tab && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-hover)' }}>
                {currentStep.tab}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-3" aria-live="polite">
            <span className="shrink-0 mt-0.5" aria-hidden="true">
              <GameIcon name={currentStep.icon} size={26} glow={phaseColors[currentStep.phase || 'early'] === '#2DCCFF' ? 'cyan' : phaseColors[currentStep.phase || 'early'] === '#56F000' ? 'green' : 'amber'} />
            </span>
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
                className="flex-1 min-h-[44px] py-2 text-xs font-medium rounded transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 min-h-[44px] py-2 text-xs font-semibold text-white rounded transition-all"
              style={{ background: phaseColors[currentStep.phase || 'early'] === '#2DCCFF' ? 'var(--accent-primary)' : phaseColors[currentStep.phase || 'early'] }}
            >
              {isLast ? (
                <span className="inline-flex items-center justify-center gap-1.5">
                  <GameIcon name="interstellar" size={13} /> Start Playing!
                </span>
              ) : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
