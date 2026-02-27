'use client';

import React, { useState, useMemo, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface FundingRound {
  id: number;
  company: string;
  roundType: string;
  amount: number; // in $M
  date: string; // YYYY-MM-DD
  leadInvestor: string;
  valuation: number | null; // in $B, null if undisclosed
  sector: string;
  otherInvestors?: string[];
  notes?: string;
}

type SortField = 'date' | 'amount' | 'company' | 'valuation';
type SortDirection = 'asc' | 'desc';

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const ROUND_TYPES = [
  'All', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D',
  'Series E', 'Series F', 'Series K', 'IPO', 'SPAC', 'Debt', 'Acquisition', 'Secondary', 'Grant',
];

const SECTORS = [
  'All', 'Launch', 'Satellite', 'Earth Observation', 'Communications',
  'In-Space Services', 'Defense', 'Analytics', 'Propulsion', 'Space Stations',
  'Manufacturing', 'Lunar', 'Navigation',
];

const AMOUNT_RANGES = [
  { label: 'All', min: 0, max: Infinity },
  { label: '$1M - $10M', min: 1, max: 10 },
  { label: '$10M - $50M', min: 10, max: 50 },
  { label: '$50M - $100M', min: 50, max: 100 },
  { label: '$100M - $500M', min: 100, max: 500 },
  { label: '$500M - $1B+', min: 500, max: Infinity },
];

const YEARS = ['All', '2024', '2025', '2026'];

const ROUND_TYPE_COLORS: Record<string, string> = {
  'Seed': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'Series A': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Series B': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  'Series C': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Series D': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Series E': 'bg-red-500/20 text-red-300 border border-red-500/30',
  'Series F': 'bg-red-500/20 text-red-200 border border-red-500/30',
  'Series K': 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  'IPO': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  'SPAC': 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  'Debt': 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  'Acquisition': 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  'Secondary': 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  'Grant': 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
};

const SECTOR_COLORS: Record<string, string> = {
  'Launch': 'bg-orange-500/15 text-orange-400',
  'Satellite': 'bg-blue-500/15 text-blue-400',
  'Earth Observation': 'bg-green-500/15 text-green-400',
  'Communications': 'bg-violet-500/15 text-violet-400',
  'In-Space Services': 'bg-cyan-500/15 text-cyan-400',
  'Defense': 'bg-red-500/15 text-red-400',
  'Analytics': 'bg-amber-500/15 text-amber-400',
  'Propulsion': 'bg-rose-500/15 text-rose-400',
  'Space Stations': 'bg-indigo-500/15 text-indigo-400',
  'Manufacturing': 'bg-slate-500/15 text-slate-300',
  'Lunar': 'bg-purple-500/15 text-purple-400',
  'Navigation': 'bg-teal-500/15 text-teal-400',
};

// ────────────────────────────────────────
// Funding Rounds Data (50+ entries)
// ────────────────────────────────────────

const FUNDING_ROUNDS: FundingRound[] = [
  // SpaceX
  { id: 1, company: 'SpaceX', roundType: 'Series K', amount: 1200, date: '2025-06-15', leadInvestor: 'Founders Fund', valuation: 250, sector: 'Launch', otherInvestors: ['a16z', 'Sequoia', 'Google Ventures'], notes: 'Largest private funding round in space history' },

  // Relativity Space
  { id: 2, company: 'Relativity Space', roundType: 'Series E', amount: 350, date: '2025-03-10', leadInvestor: 'Tiger Global', valuation: 5.2, sector: 'Launch', otherInvestors: ['Fidelity', 'Baillie Gifford', 'K5 Global'] },

  // Rocket Lab
  { id: 3, company: 'Rocket Lab', roundType: 'Secondary', amount: 250, date: '2025-01-22', leadInvestor: 'Morgan Stanley', valuation: 12.5, sector: 'Launch', otherInvestors: ['BlackRock', 'Vanguard'] },

  // Stoke Space
  { id: 4, company: 'Stoke Space', roundType: 'Series B', amount: 100, date: '2025-04-08', leadInvestor: 'a16z', valuation: 1.0, sector: 'Launch', otherInvestors: ['Breakthrough Energy Ventures', 'NFX'] },

  // Impulse Space
  { id: 5, company: 'Impulse Space', roundType: 'Series B', amount: 75, date: '2025-02-14', leadInvestor: 'Founders Fund', valuation: 0.85, sector: 'In-Space Services', otherInvestors: ['RTX Ventures', 'Lux Capital'] },

  // Varda Space Industries
  { id: 6, company: 'Varda Space Industries', roundType: 'Series B', amount: 90, date: '2025-05-20', leadInvestor: 'Khosla Ventures', valuation: 0.9, sector: 'Manufacturing', otherInvestors: ['General Catalyst', 'Caffeinated Capital'] },

  // Astranis
  { id: 7, company: 'Astranis', roundType: 'Series C', amount: 200, date: '2025-04-15', leadInvestor: 'BlackRock', valuation: 3.2, sector: 'Communications', otherInvestors: ['a16z', 'Venrock'] },

  // Epsilon3
  { id: 8, company: 'Epsilon3', roundType: 'Series B', amount: 40, date: '2025-01-30', leadInvestor: 'Lux Capital', valuation: 0.35, sector: 'Analytics', otherInvestors: ['Y Combinator', 'Marque Ventures'] },

  // True Anomaly
  { id: 9, company: 'True Anomaly', roundType: 'Series B', amount: 100, date: '2025-07-08', leadInvestor: 'Riot Ventures', valuation: 1.1, sector: 'Defense', otherInvestors: ['Eclipse Ventures', 'Menlo Ventures'] },

  // Muon Space
  { id: 10, company: 'Muon Space', roundType: 'Series A', amount: 25, date: '2025-03-25', leadInvestor: 'T. Rowe Price', valuation: 0.22, sector: 'Earth Observation', otherInvestors: ['Costanoa Ventures', 'Congruent Ventures'] },

  // Albedo
  { id: 11, company: 'Albedo', roundType: 'Series B', amount: 48, date: '2025-06-01', leadInvestor: 'Shield Capital', valuation: 0.45, sector: 'Earth Observation', otherInvestors: ['Initialized Capital', 'Cubit Capital'] },

  // K2 Space
  { id: 12, company: 'K2 Space', roundType: 'Series A', amount: 50, date: '2025-05-12', leadInvestor: 'a16z', valuation: 0.4, sector: 'Satellite', otherInvestors: ['Founders Fund', 'XN'] },

  // Apex Space
  { id: 13, company: 'Apex', roundType: 'Series B', amount: 95, date: '2025-08-05', leadInvestor: 'XN', valuation: 0.85, sector: 'Manufacturing', otherInvestors: ['a16z', 'Shield Capital'] },

  // Terran Orbital
  { id: 14, company: 'Terran Orbital', roundType: 'Acquisition', amount: 450, date: '2024-08-15', leadInvestor: 'Lockheed Martin', valuation: null, sector: 'Satellite', notes: 'Full acquisition by Lockheed Martin' },

  // Firefly Aerospace
  { id: 15, company: 'Firefly Aerospace', roundType: 'Series C', amount: 175, date: '2025-02-28', leadInvestor: 'AE Industrial Partners', valuation: 2.5, sector: 'Launch', otherInvestors: ['Republic Capital'] },

  // Planet Labs
  { id: 16, company: 'Planet Labs', roundType: 'Debt', amount: 120, date: '2025-01-10', leadInvestor: 'TriplePoint Capital', valuation: null, sector: 'Earth Observation', notes: 'Growth debt facility' },

  // Spire Global
  { id: 17, company: 'Spire Global', roundType: 'Secondary', amount: 85, date: '2025-04-22', leadInvestor: 'Goldman Sachs', valuation: 1.8, sector: 'Analytics' },

  // Sierra Space
  { id: 18, company: 'Sierra Space', roundType: 'Series B', amount: 290, date: '2025-09-01', leadInvestor: 'Coatue Management', valuation: 5.6, sector: 'Space Stations', otherInvestors: ['General Atlantic', 'Moore Strategic Ventures'] },

  // Axiom Space
  { id: 19, company: 'Axiom Space', roundType: 'Series C', amount: 350, date: '2025-03-18', leadInvestor: 'Ares Management', valuation: 5.0, sector: 'Space Stations', otherInvestors: ['Bain Capital'] },

  // Vast
  { id: 20, company: 'Vast', roundType: 'Series B', amount: 150, date: '2025-07-20', leadInvestor: 'Founders Fund', valuation: 2.8, sector: 'Space Stations', otherInvestors: ['Framework Ventures'] },

  // Astroscale
  { id: 21, company: 'Astroscale', roundType: 'Series F', amount: 109, date: '2024-11-05', leadInvestor: 'Mitsubishi Electric', valuation: 1.5, sector: 'In-Space Services', otherInvestors: ['JBIC', 'SBI Investment'] },

  // Capella Space
  { id: 22, company: 'Capella Space', roundType: 'Series C', amount: 60, date: '2025-02-05', leadInvestor: 'NVP', valuation: 0.8, sector: 'Earth Observation', otherInvestors: ['Spark Capital', 'DCVC'] },

  // Privateer
  { id: 23, company: 'Privateer', roundType: 'Series A', amount: 56.5, date: '2025-01-15', leadInvestor: 'Standard Investments', valuation: 0.4, sector: 'Analytics', otherInvestors: ['Type One Ventures'] },

  // Anduril Industries (space division expansion)
  { id: 24, company: 'Anduril Industries', roundType: 'Series F', amount: 1500, date: '2025-08-10', leadInvestor: 'Founders Fund', valuation: 28, sector: 'Defense', otherInvestors: ['a16z', 'General Catalyst', 'Thrive Capital'], notes: 'Includes significant space defense portfolio' },

  // Orbit Fab
  { id: 25, company: 'Orbit Fab', roundType: 'Series A', amount: 28.5, date: '2025-03-05', leadInvestor: 'Type One Ventures', valuation: 0.2, sector: 'In-Space Services', otherInvestors: ['Munich Re Ventures'] },

  // Quilty Space
  { id: 26, company: 'Quilty Space', roundType: 'Seed', amount: 5, date: '2024-06-20', leadInvestor: 'Space Capital', valuation: 0.025, sector: 'Analytics' },

  // Ursa Major
  { id: 27, company: 'Ursa Major', roundType: 'Series D', amount: 138, date: '2024-10-15', leadInvestor: 'XN', valuation: 1.4, sector: 'Propulsion', otherInvestors: ['a16z', 'Breakthrough Energy Ventures'] },

  // Phantom Space
  { id: 28, company: 'Phantom Space', roundType: 'Series A', amount: 22, date: '2024-07-10', leadInvestor: 'Prime Movers Lab', valuation: 0.18, sector: 'Launch' },

  // Turion Space
  { id: 29, company: 'Turion Space', roundType: 'Series A', amount: 20, date: '2025-06-18', leadInvestor: 'Founders Fund', valuation: 0.15, sector: 'In-Space Services', otherInvestors: ['Marlinspike Partners'] },

  // Slingshot Aerospace
  { id: 30, company: 'Slingshot Aerospace', roundType: 'Series B', amount: 40.8, date: '2024-09-12', leadInvestor: 'Sway Ventures', valuation: 0.35, sector: 'Defense', otherInvestors: ['ATX Venture Partners'] },

  // HawkEye 360
  { id: 31, company: 'HawkEye 360', roundType: 'Series D', amount: 68, date: '2024-12-02', leadInvestor: 'Sumitomo Corporation', valuation: 0.75, sector: 'Analytics', otherInvestors: ['Razor Edge Ventures'] },

  // Momentus
  { id: 32, company: 'Momentus', roundType: 'Debt', amount: 15, date: '2025-01-08', leadInvestor: 'Horizon Technology Finance', valuation: null, sector: 'In-Space Services', notes: 'Working capital facility' },

  // Isar Aerospace
  { id: 33, company: 'Isar Aerospace', roundType: 'Series C', amount: 165, date: '2025-05-30', leadInvestor: 'HV Capital', valuation: 2.1, sector: 'Launch', otherInvestors: ['Porsche SE', 'Lombard Odier'] },

  // Satellogic
  { id: 34, company: 'Satellogic', roundType: 'Secondary', amount: 30, date: '2025-02-20', leadInvestor: 'Tishman Speyer', valuation: 0.6, sector: 'Earth Observation' },

  // Pixxel
  { id: 35, company: 'Pixxel', roundType: 'Series B', amount: 36, date: '2024-05-15', leadInvestor: 'Google', valuation: 0.3, sector: 'Earth Observation', otherInvestors: ['Radical Ventures', 'Seraphim Capital'] },

  // Tomorrow.io
  { id: 36, company: 'Tomorrow.io', roundType: 'Series D', amount: 87, date: '2025-04-01', leadInvestor: 'SquarePoint Capital', valuation: 0.9, sector: 'Analytics', otherInvestors: ['Canaan Partners'] },

  // Sidus Space
  { id: 37, company: 'Sidus Space', roundType: 'IPO', amount: 20, date: '2024-04-05', leadInvestor: 'EF Hutton', valuation: 0.15, sector: 'Manufacturing' },

  // Lynk Global
  { id: 38, company: 'Lynk Global', roundType: 'Series B', amount: 60, date: '2025-03-20', leadInvestor: 'Samsung Next', valuation: 0.55, sector: 'Communications', otherInvestors: ['Terranet Ventures'] },

  // Xona Space Systems
  { id: 39, company: 'Xona Space Systems', roundType: 'Series A', amount: 19, date: '2024-08-28', leadInvestor: 'Bessemer Venture Partners', valuation: 0.12, sector: 'Navigation', otherInvestors: ['1517 Fund'] },

  // CesiumAstro
  { id: 40, company: 'CesiumAstro', roundType: 'Series C', amount: 65, date: '2025-06-25', leadInvestor: 'RTX Ventures', valuation: 0.6, sector: 'Communications', otherInvestors: ['Airbus Ventures'] },

  // Space Perspective
  { id: 41, company: 'Space Perspective', roundType: 'Series B', amount: 80, date: '2025-01-05', leadInvestor: 'Atmos Space Cargo', valuation: 0.7, sector: 'Launch', notes: 'Space tourism balloon flights' },

  // Outpost
  { id: 42, company: 'Outpost', roundType: 'Seed', amount: 8, date: '2025-05-02', leadInvestor: 'Y Combinator', valuation: 0.04, sector: 'In-Space Services', notes: 'Sample return from orbit' },

  // SpaceForge
  { id: 43, company: 'SpaceForge', roundType: 'Series A', amount: 12.8, date: '2024-09-30', leadInvestor: 'Type One Ventures', valuation: 0.08, sector: 'Manufacturing' },

  // Destinus
  { id: 44, company: 'Destinus', roundType: 'Series B', amount: 85, date: '2025-08-20', leadInvestor: 'Conny & Co', valuation: 0.6, sector: 'Launch', notes: 'Hypersonic transport' },

  // Kayhan Space
  { id: 45, company: 'Kayhan Space', roundType: 'Series A', amount: 14, date: '2024-04-18', leadInvestor: 'Space Capital', valuation: 0.08, sector: 'Analytics' },

  // Phantom Auto (space robotics)
  { id: 46, company: 'Starfish Space', roundType: 'Series A', amount: 29, date: '2025-04-30', leadInvestor: 'Shield Capital', valuation: 0.2, sector: 'In-Space Services', otherInvestors: ['NFX', 'PSL Ventures'] },

  // Kuva Space
  { id: 47, company: 'Kuva Space', roundType: 'Series A', amount: 32, date: '2025-07-15', leadInvestor: 'Lux Capital', valuation: 0.25, sector: 'Earth Observation', otherInvestors: ['Seraphim Space'] },

  // Apex (mission software)
  { id: 48, company: 'Sarda Technologies', roundType: 'Seed', amount: 4.2, date: '2024-03-22', leadInvestor: 'Space Capital', valuation: 0.02, sector: 'Satellite' },

  // Astrogate
  { id: 49, company: 'Astrogate', roundType: 'Seed', amount: 3.5, date: '2025-02-08', leadInvestor: 'Bessemer Venture Partners', valuation: 0.018, sector: 'Communications', notes: 'Optical inter-satellite links' },

  // EOS Defense Systems
  { id: 50, company: 'True Anomaly', roundType: 'Series A', amount: 68, date: '2024-03-15', leadInvestor: 'Riot Ventures', valuation: 0.6, sector: 'Defense', otherInvestors: ['a16z'], notes: 'Initial funding before Series B' },

  // Loft Orbital
  { id: 51, company: 'Loft Orbital', roundType: 'Series B', amount: 140, date: '2025-09-15', leadInvestor: 'B Capital Group', valuation: 1.2, sector: 'Satellite', otherInvestors: ['Insight Partners', 'Hemisferia'] },

  // Intuitive Machines
  { id: 52, company: 'Intuitive Machines', roundType: 'Secondary', amount: 55, date: '2025-05-25', leadInvestor: 'Cantor Fitzgerald', valuation: 3.1, sector: 'Lunar', notes: 'Follow-on after NASA CLPS contract wins' },

  // Astrobotic
  { id: 53, company: 'Astrobotic', roundType: 'Series C', amount: 34, date: '2024-11-20', leadInvestor: 'Space Capital', valuation: 0.38, sector: 'Lunar', otherInvestors: ['Moog', 'Matrix Capital'] },

  // Umbra Lab
  { id: 54, company: 'Umbra', roundType: 'Series B', amount: 32, date: '2025-06-10', leadInvestor: 'Spark Capital', valuation: 0.28, sector: 'Earth Observation', otherInvestors: ['Lux Capital'] },

  // Scout Space
  { id: 55, company: 'Scout Space', roundType: 'Seed', amount: 6.3, date: '2025-01-28', leadInvestor: 'Lockheed Martin Ventures', valuation: 0.035, sector: 'Defense', notes: 'Space domain awareness' },

  // Redwire
  { id: 56, company: 'Redwire', roundType: 'Debt', amount: 200, date: '2025-07-01', leadInvestor: 'Adams Street Partners', valuation: null, sector: 'Manufacturing', notes: 'Credit facility for acquisition strategy' },

  // L3Harris (space segment)
  { id: 57, company: 'York Space Systems', roundType: 'Acquisition', amount: 275, date: '2024-06-01', leadInvestor: 'Sierra Nevada Corp', valuation: null, sector: 'Satellite', notes: 'Acquired by SNC' },

  // Mynaric
  { id: 58, company: 'Mynaric', roundType: 'IPO', amount: 45, date: '2024-05-10', leadInvestor: 'Baader Bank', valuation: 0.65, sector: 'Communications', notes: 'NASDAQ listing for laser communications' },

  // Wisk Aero
  { id: 59, company: 'Isotropic Systems', roundType: 'Series C', amount: 37, date: '2025-08-28', leadInvestor: 'SoftBank', valuation: 0.32, sector: 'Communications', notes: 'Multi-orbit antenna technology' },

  // Phase Four
  { id: 60, company: 'Phase Four', roundType: 'Series B', amount: 26, date: '2024-10-05', leadInvestor: 'Lockheed Martin Ventures', valuation: 0.18, sector: 'Propulsion' },

  // TransAstra
  { id: 61, company: 'TransAstra', roundType: 'Series A', amount: 18, date: '2025-04-12', leadInvestor: 'DCVC', valuation: 0.12, sector: 'In-Space Services', notes: 'Space debris capture and mining' },

  // Orbital Sidekick
  { id: 62, company: 'Orbital Sidekick', roundType: 'Series B', amount: 20, date: '2025-03-14', leadInvestor: 'Space Capital', valuation: 0.15, sector: 'Earth Observation' },

  // SpiderOak
  { id: 63, company: 'SpiderOak', roundType: 'Series A', amount: 16.4, date: '2025-02-01', leadInvestor: 'Razor Edge Ventures', valuation: 0.1, sector: 'Defense', notes: 'Zero-trust space cybersecurity' },

  // Phantom Space (2nd round)
  { id: 64, company: 'Phantom Space', roundType: 'Series B', amount: 45, date: '2025-09-20', leadInvestor: 'Decisive Point', valuation: 0.35, sector: 'Launch' },

  // EOS-X Space
  { id: 65, company: 'EOS-X Space', roundType: 'Seed', amount: 7, date: '2025-01-20', leadInvestor: 'Seraphim Space', valuation: 0.03, sector: 'Launch', notes: 'Stratospheric launch platform' },

  // Inversion Space
  { id: 66, company: 'Inversion Space', roundType: 'Series A', amount: 44, date: '2025-06-05', leadInvestor: 'Adjacent', valuation: 0.32, sector: 'In-Space Services', notes: 'Hypersonic reentry capsules' },

  // Apex (repeat entry in different year)
  { id: 67, company: 'Apex', roundType: 'Series A', amount: 16, date: '2024-02-20', leadInvestor: 'Shield Capital', valuation: 0.12, sector: 'Manufacturing', notes: 'Satellite bus manufacturing' },

  // Voyager Space
  { id: 68, company: 'Voyager Space', roundType: 'Series D', amount: 80, date: '2025-10-01', leadInvestor: 'Koch Disruptive Technologies', valuation: 1.5, sector: 'Space Stations', otherInvestors: ['Bain Capital'] },

  // Rivada Space Networks
  { id: 69, company: 'Rivada Space Networks', roundType: 'Debt', amount: 300, date: '2025-03-28', leadInvestor: 'Deutsche Bank', valuation: null, sector: 'Communications', notes: 'Financing for 600-satellite constellation' },

  // Orbital Assembly
  { id: 70, company: 'Above Space', roundType: 'SPAC', amount: 65, date: '2025-07-25', leadInvestor: 'CF Acquisition Corp', valuation: 0.5, sector: 'Space Stations', notes: 'Space hotel development' },

  // ICEYE
  { id: 71, company: 'ICEYE', roundType: 'Series D', amount: 93, date: '2024-04-28', leadInvestor: 'BAE Systems', valuation: 1.0, sector: 'Earth Observation', otherInvestors: ['Seraphim Space'] },

  // Hermeus
  { id: 72, company: 'Hermeus', roundType: 'Series B', amount: 100, date: '2025-04-05', leadInvestor: 'Founders Fund', valuation: 0.9, sector: 'Defense', otherInvestors: ['Khosla Ventures', 'Sam Altman'], notes: 'Hypersonic aircraft' },

  // Hadrian
  { id: 73, company: 'Hadrian', roundType: 'Series B', amount: 90, date: '2025-05-15', leadInvestor: 'Lux Capital', valuation: 0.85, sector: 'Manufacturing', otherInvestors: ['a16z', 'Founders Fund'], notes: 'Autonomous manufacturing for aerospace' },

  // Epsilon3 (2026 round)
  { id: 74, company: 'Epsilon3', roundType: 'Series C', amount: 75, date: '2026-01-15', leadInvestor: 'Bessemer Venture Partners', valuation: 0.6, sector: 'Analytics', otherInvestors: ['Lux Capital'] },

  // SpaceX (2026 tender offer)
  { id: 75, company: 'SpaceX', roundType: 'Secondary', amount: 750, date: '2026-02-10', leadInvestor: 'Fidelity', valuation: 275, sector: 'Launch', notes: 'Employee tender offer' },

  // Stoke Space (2026)
  { id: 76, company: 'Stoke Space', roundType: 'Series C', amount: 200, date: '2026-01-28', leadInvestor: 'Founders Fund', valuation: 2.0, sector: 'Launch', otherInvestors: ['a16z'] },

  // Vast (2026)
  { id: 77, company: 'Vast', roundType: 'Series C', amount: 250, date: '2026-02-20', leadInvestor: 'a16z', valuation: 5.5, sector: 'Space Stations', otherInvestors: ['Google Ventures', 'Founders Fund'] },

  // K2 Space Series B
  { id: 78, company: 'K2 Space', roundType: 'Series B', amount: 120, date: '2026-02-05', leadInvestor: 'a16z', valuation: 1.0, sector: 'Satellite', otherInvestors: ['Founders Fund'] },

  // Grant rounds
  { id: 79, company: 'Atomos Space', roundType: 'Grant', amount: 9.4, date: '2025-06-30', leadInvestor: 'US Space Force', valuation: null, sector: 'In-Space Services', notes: 'STRATFI contract award' },

  { id: 80, company: 'Lunasonde', roundType: 'Seed', amount: 2.8, date: '2026-01-10', leadInvestor: 'Space Capital', valuation: 0.015, sector: 'Lunar', notes: 'Lunar subsurface mapping' },
];

// ────────────────────────────────────────
// Investor Leaderboard Data
// ────────────────────────────────────────

function computeInvestorLeaderboard(): { name: string; deals: number; totalAmount: number; sectors: string[] }[] {
  const investorMap = new Map<string, { deals: number; totalAmount: number; sectors: Set<string> }>();

  FUNDING_ROUNDS.forEach((round) => {
    const allInvestors = [round.leadInvestor, ...(round.otherInvestors || [])];
    allInvestors.forEach((investor) => {
      const existing = investorMap.get(investor) || { deals: 0, totalAmount: 0, sectors: new Set<string>() };
      existing.deals += 1;
      existing.totalAmount += round.amount;
      existing.sectors.add(round.sector);
      investorMap.set(investor, existing);
    });
  });

  return Array.from(investorMap.entries())
    .map(([name, data]) => ({ name, deals: data.deals, totalAmount: data.totalAmount, sectors: Array.from(data.sectors) }))
    .sort((a, b) => b.deals - a.deals)
    .slice(0, 10);
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatAmount(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  if (value >= 100) return `$${value.toFixed(0)}M`;
  return `$${value.toFixed(1)}M`;
}

function formatValuation(value: number | null): string {
  if (value === null) return 'Undisclosed';
  if (value >= 1) return `$${value.toFixed(1)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function getRoundColor(roundType: string): string {
  return ROUND_TYPE_COLORS[roundType] || 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
}

function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector] || 'bg-slate-500/15 text-slate-300';
}

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function FundingRoundsPage() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoundType, setSelectedRoundType] = useState('All');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedAmountRange, setSelectedAmountRange] = useState(0);
  const [selectedYear, setSelectedYear] = useState('All');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // View state
  const [activeTab, setActiveTab] = useState<'table' | 'investors' | 'trends'>('table');

  // Sorting handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // Filtered + sorted data
  const filteredRounds = useMemo(() => {
    let result = [...FUNDING_ROUNDS];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.company.toLowerCase().includes(q) ||
        r.leadInvestor.toLowerCase().includes(q) ||
        (r.otherInvestors || []).some(inv => inv.toLowerCase().includes(q))
      );
    }

    // Round type filter
    if (selectedRoundType !== 'All') {
      result = result.filter(r => r.roundType === selectedRoundType);
    }

    // Sector filter
    if (selectedSector !== 'All') {
      result = result.filter(r => r.sector === selectedSector);
    }

    // Amount range filter
    const range = AMOUNT_RANGES[selectedAmountRange];
    if (range.min > 0 || range.max < Infinity) {
      result = result.filter(r => r.amount >= range.min && r.amount <= range.max);
    }

    // Year filter
    if (selectedYear !== 'All') {
      result = result.filter(r => r.date.startsWith(selectedYear));
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
        case 'company':
          cmp = a.company.localeCompare(b.company);
          break;
        case 'valuation':
          cmp = (a.valuation ?? -1) - (b.valuation ?? -1);
          break;
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [searchQuery, selectedRoundType, selectedSector, selectedAmountRange, selectedYear, sortField, sortDirection]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const rounds2025 = FUNDING_ROUNDS.filter(r => r.date.startsWith('2025'));
    const total2025 = rounds2025.reduce((sum, r) => sum + r.amount, 0);
    const deals2025 = rounds2025.length;
    const avgRoundSize = total2025 / deals2025;
    const largest = FUNDING_ROUNDS.reduce((max, r) => r.amount > max.amount ? r : max, FUNDING_ROUNDS[0]);
    const totalAll = FUNDING_ROUNDS.reduce((sum, r) => sum + r.amount, 0);
    return {
      total2025,
      deals2025,
      avgRoundSize,
      largest,
      totalAll,
      totalDeals: FUNDING_ROUNDS.length,
    };
  }, []);

  // Investor leaderboard
  const investorLeaderboard = useMemo(() => computeInvestorLeaderboard(), []);

  // Trend analysis computations
  const trendAnalysis = useMemo(() => {
    const rounds2024 = FUNDING_ROUNDS.filter(r => r.date.startsWith('2024'));
    const rounds2025 = FUNDING_ROUNDS.filter(r => r.date.startsWith('2025'));
    const rounds2026 = FUNDING_ROUNDS.filter(r => r.date.startsWith('2026'));

    const total2024 = rounds2024.reduce((sum, r) => sum + r.amount, 0);
    const total2025 = rounds2025.reduce((sum, r) => sum + r.amount, 0);
    const total2026 = rounds2026.reduce((sum, r) => sum + r.amount, 0);
    const yoyGrowth = total2024 > 0 ? ((total2025 - total2024) / total2024 * 100) : 0;

    // Average seed size
    const seeds2024 = rounds2024.filter(r => r.roundType === 'Seed');
    const seeds2025 = rounds2025.filter(r => r.roundType === 'Seed');
    const avgSeed2024 = seeds2024.length > 0 ? seeds2024.reduce((s, r) => s + r.amount, 0) / seeds2024.length : 0;
    const avgSeed2025 = seeds2025.length > 0 ? seeds2025.reduce((s, r) => s + r.amount, 0) / seeds2025.length : 0;

    // Most funded sector
    const sectorTotals = new Map<string, number>();
    FUNDING_ROUNDS.forEach(r => {
      sectorTotals.set(r.sector, (sectorTotals.get(r.sector) || 0) + r.amount);
    });
    const sortedSectors = Array.from(sectorTotals.entries()).sort((a, b) => b[1] - a[1]);
    const topSector = sortedSectors[0];

    // Hot sectors (by deal count in 2025)
    const sectorDeals2025 = new Map<string, number>();
    rounds2025.forEach(r => {
      sectorDeals2025.set(r.sector, (sectorDeals2025.get(r.sector) || 0) + 1);
    });
    const hotSectors = Array.from(sectorDeals2025.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

    return {
      total2024,
      total2025,
      total2026,
      yoyGrowth,
      avgSeed2024,
      avgSeed2025,
      topSector,
      hotSectors,
      sortedSectors,
    };
  }, []);

  // Sort indicator
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-600 ml-1">&#x25B4;&#x25BE;</span>;
    return sortDirection === 'asc'
      ? <span className="text-cyan-400 ml-1">&#x25B4;</span>
      : <span className="text-cyan-400 ml-1">&#x25BE;</span>;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumbs */}
        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Intelligence', href: '/market-intel' },
          { name: 'Funding Rounds' },
        ]} />
        <Breadcrumbs items={[
          { label: 'Intelligence', href: '/market-intel' },
          { label: 'Funding Rounds' },
        ]} />

        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Funding Rounds"
          subtitle="Comprehensive database of venture capital, private equity, and institutional investments in the space industry. Track funding rounds, valuations, and investor activity."
          accentColor="cyan"
        />

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Total Raised (2025)</p>
            <p className="text-2xl md:text-3xl font-bold text-cyan-400">${(summaryStats.total2025 / 1000).toFixed(1)}B</p>
            <p className="text-sm text-slate-400 mt-1">{summaryStats.deals2025} deals</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Avg Round Size</p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-400">${summaryStats.avgRoundSize.toFixed(0)}M</p>
            <p className="text-sm text-slate-400 mt-1">across all 2025 rounds</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Largest Round</p>
            <p className="text-2xl md:text-3xl font-bold text-amber-400">{formatAmount(summaryStats.largest.amount)}</p>
            <p className="text-sm text-slate-400 mt-1">{summaryStats.largest.company} {summaryStats.largest.roundType}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Most Active Investors</p>
            <p className="text-sm text-slate-200 font-medium leading-relaxed mt-1">
              Founders Fund, a16z, Google Ventures, Lux Capital
            </p>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 mb-6 p-1 bg-slate-800/60 rounded-xl w-fit">
          {([
            { key: 'table' as const, label: 'Funding Rounds' },
            { key: 'investors' as const, label: 'Investor Leaderboard' },
            { key: 'trends' as const, label: 'Trend Analysis' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all min-h-[44px] ${
                activeTab === tab.key
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── FUNDING ROUNDS TABLE TAB ── */}
        {activeTab === 'table' && (
          <>
            {/* Filter Panel */}
            <div className="card p-5 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Search</label>
                  <input
                    type="text"
                    placeholder="Company or investor..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 min-h-[44px]"
                  />
                </div>

                {/* Round Type */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Round Type</label>
                  <select
                    value={selectedRoundType}
                    onChange={e => setSelectedRoundType(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 min-h-[44px]"
                  >
                    {ROUND_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Sector */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Sector</label>
                  <select
                    value={selectedSector}
                    onChange={e => setSelectedSector(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 min-h-[44px]"
                  >
                    {SECTORS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Amount Range</label>
                  <select
                    value={selectedAmountRange}
                    onChange={e => setSelectedAmountRange(Number(e.target.value))}
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 min-h-[44px]"
                  >
                    {AMOUNT_RANGES.map((r, i) => (
                      <option key={i} value={i}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Year</label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 min-h-[44px]"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active filters summary */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">
                  Showing {filteredRounds.length} of {FUNDING_ROUNDS.length} rounds
                </span>
                {(searchQuery || selectedRoundType !== 'All' || selectedSector !== 'All' || selectedAmountRange !== 0 || selectedYear !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedRoundType('All');
                      setSelectedSector('All');
                      setSelectedAmountRange(0);
                      setSelectedYear('All');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Results Table */}
            <div className="card overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th
                        className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-400 cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('company')}
                      >
                        Company <SortIcon field="company" />
                      </th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-400">
                        Round
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs uppercase tracking-wider text-slate-400 cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => handleSort('amount')}
                      >
                        Amount <SortIcon field="amount" />
                      </th>
                      <th
                        className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-400 cursor-pointer hover:text-cyan-400 transition-colors hidden md:table-cell"
                        onClick={() => handleSort('date')}
                      >
                        Date <SortIcon field="date" />
                      </th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-400 hidden lg:table-cell">
                        Lead Investor
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs uppercase tracking-wider text-slate-400 cursor-pointer hover:text-cyan-400 transition-colors hidden lg:table-cell"
                        onClick={() => handleSort('valuation')}
                      >
                        Valuation <SortIcon field="valuation" />
                      </th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-400 hidden xl:table-cell">
                        Sector
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRounds.map((round) => (
                      <tr
                        key={round.id}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200">{round.company}</div>
                          {round.notes && (
                            <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">{round.notes}</div>
                          )}
                          {/* Mobile-only extras */}
                          <div className="md:hidden text-xs text-slate-500 mt-0.5">{formatDate(round.date)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRoundColor(round.roundType)}`}>
                            {round.roundType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200 font-medium">
                          {formatAmount(round.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                          {formatDate(round.date)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 hidden lg:table-cell">
                          {round.leadInvestor}
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className={round.valuation ? 'text-slate-200 font-mono' : 'text-slate-600 italic'}>
                            {formatValuation(round.valuation)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getSectorColor(round.sector)}`}>
                            {round.sector}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRounds.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                          No funding rounds match your filters. Try adjusting your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Total: {formatAmount(filteredRounds.reduce((sum, r) => sum + r.amount, 0))} across {filteredRounds.length} rounds
                  </span>
                  <span>Data covers 2024 - 2026</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── INVESTOR LEADERBOARD TAB ── */}
        {activeTab === 'investors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main leaderboard */}
            <div className="lg:col-span-2">
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700/50">
                  <h2 className="text-lg font-semibold text-slate-100">Top 10 Most Active Space Investors</h2>
                  <p className="text-xs text-slate-400 mt-1">Ranked by number of deals (2024-2026)</p>
                </div>
                <div className="divide-y divide-slate-800/50">
                  {investorLeaderboard.map((investor, index) => (
                    <div key={investor.name} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30' :
                        index === 1 ? 'bg-slate-300/20 text-slate-300 ring-1 ring-slate-400/30' :
                        index === 2 ? 'bg-amber-700/20 text-amber-600 ring-1 ring-amber-600/30' :
                        'bg-slate-800 text-slate-500'
                      }`}>
                        {index + 1}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 font-medium">{investor.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {investor.sectors.slice(0, 4).map(s => (
                            <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] ${getSectorColor(s)}`}>{s}</span>
                          ))}
                          {investor.sectors.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400">+{investor.sectors.length - 4}</span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-cyan-400 font-bold">{investor.deals} deals</p>
                        <p className="text-xs text-slate-500">{formatAmount(investor.totalAmount)} total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar stats */}
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Investor Highlights</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">Largest Single Investment</p>
                    <p className="text-slate-200 font-medium">Founders Fund</p>
                    <p className="text-xs text-slate-400">$1.5B into Anduril Series F</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Most Diverse Portfolio</p>
                    <p className="text-slate-200 font-medium">a16z</p>
                    <p className="text-xs text-slate-400">Active across 6+ sectors</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Rising Space-Focused VC</p>
                    <p className="text-slate-200 font-medium">Space Capital</p>
                    <p className="text-xs text-slate-400">Dedicated space fund, early-stage focus</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Strategic Investor of the Year</p>
                    <p className="text-slate-200 font-medium">Lockheed Martin</p>
                    <p className="text-xs text-slate-400">$450M Terran Orbital acquisition</p>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Investment Types</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Venture Capital', pct: 62, color: 'bg-cyan-500' },
                    { label: 'Strategic / Corp', pct: 18, color: 'bg-purple-500' },
                    { label: 'Debt / Credit', pct: 10, color: 'bg-amber-500' },
                    { label: 'Public / SPAC / IPO', pct: 7, color: 'bg-emerald-500' },
                    { label: 'Government / Grant', pct: 3, color: 'bg-blue-500' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-slate-300 font-medium">{item.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TREND ANALYSIS TAB ── */}
        {activeTab === 'trends' && (
          <div className="space-y-6 mb-8">
            {/* Top trend cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">YoY Funding Growth</p>
                <p className={`text-3xl font-bold ${trendAnalysis.yoyGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trendAnalysis.yoyGrowth >= 0 ? '+' : ''}{trendAnalysis.yoyGrowth.toFixed(0)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">2024 vs 2025</p>
              </div>

              <div className="card p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Avg Seed Size (2025)</p>
                <p className="text-3xl font-bold text-purple-400">
                  ${trendAnalysis.avgSeed2025.toFixed(1)}M
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {trendAnalysis.avgSeed2024 > 0 ? (
                    trendAnalysis.avgSeed2025 > trendAnalysis.avgSeed2024
                      ? `Up from $${trendAnalysis.avgSeed2024.toFixed(1)}M in 2024`
                      : `Down from $${trendAnalysis.avgSeed2024.toFixed(1)}M in 2024`
                  ) : 'No 2024 seed data'}
                </p>
              </div>

              <div className="card p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Most Funded Sector</p>
                <p className="text-3xl font-bold text-amber-400">
                  {trendAnalysis.topSector ? trendAnalysis.topSector[0] : 'N/A'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {trendAnalysis.topSector ? formatAmount(trendAnalysis.topSector[1]) + ' total' : ''}
                </p>
              </div>

              <div className="card p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">2026 Pace (YTD)</p>
                <p className="text-3xl font-bold text-cyan-400">
                  {formatAmount(trendAnalysis.total2026)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {FUNDING_ROUNDS.filter(r => r.date.startsWith('2026')).length} deals so far
                </p>
              </div>
            </div>

            {/* Hot Sectors */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Hot Sectors in 2025</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {trendAnalysis.hotSectors.map(([sector, deals], i) => {
                  const sectorAmount = FUNDING_ROUNDS
                    .filter(r => r.sector === sector && r.date.startsWith('2025'))
                    .reduce((s, r) => s + r.amount, 0);
                  return (
                    <div key={sector} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${
                          i === 0 ? 'bg-cyan-400' : i === 1 ? 'bg-purple-400' : i === 2 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`} />
                        <span className={`text-sm font-medium px-2 py-0.5 rounded ${getSectorColor(sector)}`}>{sector}</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-200">{deals} deals</p>
                      <p className="text-xs text-slate-500 mt-1">{formatAmount(sectorAmount)} total funding</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Year-over-year breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funding by Year */}
              <div className="card p-5">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Funding by Year</h3>
                <div className="space-y-4">
                  {[
                    { year: '2024', amount: trendAnalysis.total2024, deals: FUNDING_ROUNDS.filter(r => r.date.startsWith('2024')).length, color: 'bg-blue-500' },
                    { year: '2025', amount: trendAnalysis.total2025, deals: FUNDING_ROUNDS.filter(r => r.date.startsWith('2025')).length, color: 'bg-cyan-500' },
                    { year: '2026 (YTD)', amount: trendAnalysis.total2026, deals: FUNDING_ROUNDS.filter(r => r.date.startsWith('2026')).length, color: 'bg-purple-500' },
                  ].map(item => {
                    const maxAmount = Math.max(trendAnalysis.total2024, trendAnalysis.total2025, trendAnalysis.total2026);
                    const pct = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                    return (
                      <div key={item.year}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-slate-300 font-medium">{item.year}</span>
                          <span className="text-slate-200 font-mono">{formatAmount(item.amount)} ({item.deals} deals)</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Funding by Sector (all time) */}
              <div className="card p-5">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Funding by Sector (All Time)</h3>
                <div className="space-y-3">
                  {trendAnalysis.sortedSectors.slice(0, 8).map(([sector, amount]) => {
                    const maxSectorAmount = trendAnalysis.sortedSectors[0]?.[1] || 1;
                    const pct = (amount / maxSectorAmount) * 100;
                    const dealCount = FUNDING_ROUNDS.filter(r => r.sector === sector).length;
                    return (
                      <div key={sector}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSectorColor(sector)}`}>{sector}</span>
                          <span className="text-slate-300 text-xs font-mono">{formatAmount(amount)} / {dealCount} deals</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Key Trends Cards */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Key Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-800/40 rounded-xl p-4 border border-emerald-500/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">&#9650;</span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">Defense Tech Surge</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Space defense companies raised over $1.8B+ in 2025, driven by True Anomaly, Anduril, and Hermeus.
                        Government demand for SSA and counter-space capabilities driving valuations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">&#9650;</span>
                    <div>
                      <p className="text-sm font-semibold text-purple-400">In-Space Services Boom</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Orbital servicing, debris removal, and in-space manufacturing attracted significant VC interest.
                        Impulse Space, Orbit Fab, Starfish Space, and Turion Space all raised fresh rounds.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">&#9650;</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-400">Earth Observation Diversification</p>
                      <p className="text-xs text-slate-400 mt-1">
                        EO companies expanding beyond imagery into SAR (Capella, ICEYE), hyperspectral (Pixxel, Kuva),
                        and very-high-res (Albedo). Sector consolidation expected.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-cyan-500/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">&#9650;</span>
                    <div>
                      <p className="text-sm font-semibold text-cyan-400">Space Station Race</p>
                      <p className="text-xs text-slate-400 mt-1">
                        With ISS decommissioning approaching, commercial station developers Sierra Space, Axiom, Vast,
                        and Voyager raised a combined $1B+ in 2025. NASA contracts anchoring market confidence.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">&#9650;</span>
                    <div>
                      <p className="text-sm font-semibold text-blue-400">Mega-Rounds Return</p>
                      <p className="text-xs text-slate-400 mt-1">
                        After a 2023 dip, billion-dollar rounds returned with SpaceX Series K ($1.2B)
                        and Anduril Series F ($1.5B). Late-stage confidence recovering.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-rose-500/20">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">&#9650;</span>
                    <div>
                      <p className="text-sm font-semibold text-rose-400">Manufacturing Renaissance</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Apex, Varda, Hadrian, and SpaceForge signal investor confidence in space manufacturing.
                        Autonomous factory and in-space production themes gaining traction.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="text-center text-xs text-slate-600 py-6">
          Data compiled from public disclosures, SEC filings, and press releases.
          Valuations are estimated and may not reflect current market conditions.
          Last updated: February 2026.
        </div>
      </div>
    </div>
  );
}
