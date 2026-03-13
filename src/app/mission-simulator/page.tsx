'use client';

import { useState, useMemo, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ════════════════════════════════════════
// Types & Constants
// ════════════════════════════════════════

type MissionType =
  | 'leo_satellite'
  | 'geo_comsat'
  | 'lunar_lander'
  | 'mars_orbiter'
  | 'iss_resupply'
  | 'asteroid_rendezvous';

type LaunchVehicleId =
  | 'falcon9'
  | 'falcon_heavy'
  | 'starship'
  | 'vulcan_centaur'
  | 'new_glenn'
  | 'ariane6'
  | 'pslv'
  | 'electron'
  | 'neutron';

type TargetOrbit = 'LEO' | 'SSO' | 'MEO' | 'GEO' | 'TLI' | 'TMI';
type LaunchSite = 'cape_canaveral' | 'vandenberg' | 'baikonur' | 'kourou' | 'mahia';

interface LaunchVehicleData {
  id: LaunchVehicleId;
  name: string;
  provider: string;
  leoCapacity: number; // kg
  gtoCapacity: number | null;
  costM: number; // million USD
  isp: number; // seconds
  reliability: number; // 0-1
  stages: number;
  reusable: boolean;
}

interface MissionTypeInfo {
  id: MissionType;
  label: string;
  description: string;
  defaultOrbit: TargetOrbit;
  defaultVehicle: LaunchVehicleId;
  defaultPayload: number;
}

interface OrbitInfo {
  label: string;
  altitudeKm: string;
  deltaV: number; // m/s total from ground
}

interface LaunchSiteInfo {
  label: string;
  latitude: number;
  country: string;
}

interface MissionPhase {
  time: string;
  label: string;
  description: string;
  icon: string;
}

interface HistoricalMission {
  name: string;
  year: number;
  vehicle: string;
  outcome: 'success' | 'partial' | 'failure';
  payload: string;
  notes: string;
}

interface MissionTemplate {
  label: string;
  icon: string;
  missionType: MissionType;
  vehicle: LaunchVehicleId;
  payload: number;
  orbit: TargetOrbit;
  site: LaunchSite;
  description: string;
}

// ════════════════════════════════════════
// Data
// ════════════════════════════════════════

const LAUNCH_VEHICLES: LaunchVehicleData[] = [
  { id: 'falcon9', name: 'Falcon 9', provider: 'SpaceX', leoCapacity: 22800, gtoCapacity: 8300, costM: 67, isp: 311, reliability: 0.98, stages: 2, reusable: true },
  { id: 'falcon_heavy', name: 'Falcon Heavy', provider: 'SpaceX', leoCapacity: 63800, gtoCapacity: 26700, costM: 97, isp: 311, reliability: 0.97, stages: 2, reusable: true },
  { id: 'starship', name: 'Starship', provider: 'SpaceX', leoCapacity: 150000, gtoCapacity: null, costM: 10, isp: 380, reliability: 0.85, stages: 2, reusable: true },
  { id: 'vulcan_centaur', name: 'Vulcan Centaur', provider: 'ULA', leoCapacity: 27200, gtoCapacity: 14400, costM: 110, isp: 451, reliability: 0.95, stages: 2, reusable: false },
  { id: 'new_glenn', name: 'New Glenn', provider: 'Blue Origin', leoCapacity: 45000, gtoCapacity: 13000, costM: 70, isp: 316, reliability: 0.90, stages: 2, reusable: true },
  { id: 'ariane6', name: 'Ariane 6', provider: 'Arianespace', leoCapacity: 21650, gtoCapacity: 11500, costM: 77, isp: 457, reliability: 0.95, stages: 2, reusable: false },
  { id: 'pslv', name: 'PSLV', provider: 'ISRO', leoCapacity: 3800, gtoCapacity: null, costM: 30, isp: 295, reliability: 0.94, stages: 4, reusable: false },
  { id: 'electron', name: 'Electron', provider: 'Rocket Lab', leoCapacity: 300, gtoCapacity: null, costM: 7.5, isp: 311, reliability: 0.95, stages: 2, reusable: true },
  { id: 'neutron', name: 'Neutron', provider: 'Rocket Lab', leoCapacity: 13000, gtoCapacity: null, costM: 50, isp: 310, reliability: 0.92, stages: 2, reusable: true },
];

const MISSION_TYPES: MissionTypeInfo[] = [
  { id: 'leo_satellite', label: 'LEO Satellite Deployment', description: 'Deploy satellites to low Earth orbit', defaultOrbit: 'LEO', defaultVehicle: 'falcon9', defaultPayload: 4000 },
  { id: 'geo_comsat', label: 'GEO Comsat', description: 'Communications satellite to geostationary orbit', defaultOrbit: 'GEO', defaultVehicle: 'falcon_heavy', defaultPayload: 6000 },
  { id: 'lunar_lander', label: 'Lunar Lander', description: 'Lunar landing mission via trans-lunar injection', defaultOrbit: 'TLI', defaultVehicle: 'starship', defaultPayload: 10000 },
  { id: 'mars_orbiter', label: 'Mars Orbiter', description: 'Mars orbit insertion via trans-Mars injection', defaultOrbit: 'TMI', defaultVehicle: 'falcon_heavy', defaultPayload: 1000 },
  { id: 'iss_resupply', label: 'ISS Resupply', description: 'Cargo delivery to the International Space Station', defaultOrbit: 'LEO', defaultVehicle: 'falcon9', defaultPayload: 6000 },
  { id: 'asteroid_rendezvous', label: 'Asteroid Rendezvous', description: 'Deep-space rendezvous with a near-Earth asteroid', defaultOrbit: 'TMI', defaultVehicle: 'falcon_heavy', defaultPayload: 800 },
];

const ORBITS: Record<TargetOrbit, OrbitInfo> = {
  LEO: { label: 'LEO (400 km)', altitudeKm: '400 km', deltaV: 9400 },
  SSO: { label: 'SSO (600 km)', altitudeKm: '600 km', deltaV: 9800 },
  MEO: { label: 'MEO (20,200 km)', altitudeKm: '20,200 km', deltaV: 12000 },
  GEO: { label: 'GEO (35,786 km)', altitudeKm: '35,786 km', deltaV: 14000 },
  TLI: { label: 'Trans-Lunar Injection', altitudeKm: '384,400 km', deltaV: 12500 },
  TMI: { label: 'Trans-Mars Injection', altitudeKm: '~225M km', deltaV: 15500 },
};

const LAUNCH_SITES: Record<LaunchSite, LaunchSiteInfo> = {
  cape_canaveral: { label: 'Cape Canaveral, FL', latitude: 28.5, country: 'USA' },
  vandenberg: { label: 'Vandenberg SFB, CA', latitude: 34.7, country: 'USA' },
  baikonur: { label: 'Baikonur Cosmodrome', latitude: 45.6, country: 'Kazakhstan' },
  kourou: { label: 'Guiana Space Centre, Kourou', latitude: 5.2, country: 'French Guiana' },
  mahia: { label: 'Mahia Peninsula', latitude: -39.3, country: 'New Zealand' },
};

const MISSION_TEMPLATES: MissionTemplate[] = [
  { label: 'Starlink Deploy', icon: '🛰️', missionType: 'leo_satellite', vehicle: 'falcon9', payload: 800, orbit: 'LEO', site: 'cape_canaveral', description: 'Falcon 9, 800 kg x 60 sats, LEO 550 km' },
  { label: 'GPS Satellite', icon: '📡', missionType: 'leo_satellite', vehicle: 'falcon9', payload: 4400, orbit: 'MEO', site: 'cape_canaveral', description: 'Falcon 9, 4,400 kg, MEO 20,200 km' },
  { label: 'Lunar Lander', icon: '🌙', missionType: 'lunar_lander', vehicle: 'starship', payload: 100000, orbit: 'TLI', site: 'cape_canaveral', description: 'Starship, 100,000 kg, TLI' },
  { label: 'Mars Rover', icon: '🔴', missionType: 'mars_orbiter', vehicle: 'falcon_heavy', payload: 1025, orbit: 'TMI', site: 'cape_canaveral', description: 'Atlas V equiv., 1,025 kg, TMI' },
  { label: 'ISS Resupply', icon: '🚀', missionType: 'iss_resupply', vehicle: 'falcon9', payload: 6000, orbit: 'LEO', site: 'cape_canaveral', description: 'Falcon 9, 6,000 kg, LEO 408 km' },
];

const HISTORICAL_MISSIONS: Record<MissionType, HistoricalMission[]> = {
  leo_satellite: [
    { name: 'Starlink v1.5 L1', year: 2022, vehicle: 'Falcon 9', outcome: 'success', payload: '49 Starlink sats (~800 kg batch)', notes: 'Routine constellation deployment to 540 km shell' },
    { name: 'OneWeb #14', year: 2022, vehicle: 'Falcon 9', outcome: 'success', payload: '40 OneWeb satellites', notes: 'Replaced Soyuz launches after Roscosmos dispute' },
    { name: 'WorldView Legion 1&2', year: 2023, vehicle: 'Falcon 9', outcome: 'success', payload: '2 imaging satellites', notes: 'Sub-meter commercial Earth observation' },
    { name: 'Iridium NEXT Flight 1', year: 2017, vehicle: 'Falcon 9', outcome: 'success', payload: '10 Iridium NEXT sats', notes: 'First of 8 launches for 75-satellite constellation' },
  ],
  geo_comsat: [
    { name: 'SES-18 & SES-19', year: 2022, vehicle: 'Falcon 9', outcome: 'success', payload: 'Dual C-band comsats', notes: 'FCC spectrum clearing for 5G' },
    { name: 'Viasat-3 Americas', year: 2023, vehicle: 'Falcon Heavy', outcome: 'partial', payload: '~6,400 kg comsat', notes: 'Antenna deployment anomaly reduced capacity' },
    { name: 'Intelsat 40e', year: 2023, vehicle: 'Falcon 9', outcome: 'success', payload: 'GEO communications satellite', notes: 'Also carried NASA TEMPO instrument' },
    { name: 'JCSAT-18/Kacific-1', year: 2019, vehicle: 'Falcon 9', outcome: 'success', payload: '6,956 kg dual-mission', notes: 'HTS Ka-band coverage for Asia-Pacific' },
  ],
  lunar_lander: [
    { name: 'Chandrayaan-3', year: 2023, vehicle: 'LVM3', outcome: 'success', payload: '~3,900 kg total', notes: 'India became 4th country to soft-land on the Moon' },
    { name: 'SLIM (Smart Lander)', year: 2024, vehicle: 'H-IIA', outcome: 'partial', payload: '~700 kg lander', notes: 'Landed upside-down but achieved precision landing goal' },
    { name: 'Intuitive Machines IM-1', year: 2024, vehicle: 'Falcon 9', outcome: 'partial', payload: 'Nova-C lander', notes: 'First US lunar landing since Apollo; tipped on side' },
    { name: 'Apollo 11', year: 1969, vehicle: 'Saturn V', outcome: 'success', payload: '~44,000 kg to TLI', notes: 'First crewed Moon landing, historic achievement' },
  ],
  mars_orbiter: [
    { name: 'Mars Perseverance', year: 2020, vehicle: 'Atlas V 541', outcome: 'success', payload: '1,025 kg rover', notes: 'Ingenuity helicopter, sample caching for return' },
    { name: 'Mars Hope (Al Amal)', year: 2020, vehicle: 'H-IIA', outcome: 'success', payload: '~1,350 kg orbiter', notes: 'UAE first interplanetary mission, weather study' },
    { name: 'Mars Mangalyaan', year: 2013, vehicle: 'PSLV-XL', outcome: 'success', payload: '~1,340 kg orbiter', notes: 'India first attempt, $74M budget, lasted 8 years' },
    { name: 'Mars InSight', year: 2018, vehicle: 'Atlas V 401', outcome: 'success', payload: '694 kg lander', notes: 'Interior study, seismometer detected marsquakes' },
  ],
  iss_resupply: [
    { name: 'CRS-29 (Dragon)', year: 2023, vehicle: 'Falcon 9', outcome: 'success', payload: '~2,900 kg cargo', notes: 'SpaceX Commercial Resupply Services' },
    { name: 'Cygnus NG-20', year: 2023, vehicle: 'Falcon 9', outcome: 'success', payload: '~3,700 kg cargo', notes: 'Transitioned from Antares to Falcon 9 launch' },
    { name: 'HTV-9 Kounotori', year: 2020, vehicle: 'H-IIB', outcome: 'success', payload: '~5,300 kg cargo', notes: 'Final HTV mission, carried batteries & supplies' },
    { name: 'Progress MS-25', year: 2023, vehicle: 'Soyuz-2.1a', outcome: 'success', payload: '~2,500 kg cargo', notes: 'Russian automated cargo to Zvezda module' },
  ],
  asteroid_rendezvous: [
    { name: 'OSIRIS-REx', year: 2016, vehicle: 'Atlas V 411', outcome: 'success', payload: '2,110 kg spacecraft', notes: 'Returned 121g sample from Bennu in Sept 2023' },
    { name: 'Hayabusa2', year: 2014, vehicle: 'H-IIA', outcome: 'success', payload: '609 kg spacecraft', notes: 'Returned 5.4g from Ryugu, now extended mission' },
    { name: 'DART', year: 2021, vehicle: 'Falcon 9', outcome: 'success', payload: '610 kg impactor', notes: 'Successfully altered Dimorphos orbit by 33 min' },
    { name: 'Lucy', year: 2021, vehicle: 'Atlas V 401', outcome: 'success', payload: '1,550 kg spacecraft', notes: '12-year mission to visit 8 Jupiter Trojan asteroids' },
  ],
};

// ════════════════════════════════════════
// Calculation Helpers
// ════════════════════════════════════════

const G0 = 9.80665; // m/s^2

function calcFuelMassFraction(deltaV: number, isp: number): number {
  // Tsiolkovsky: dv = Isp * g0 * ln(m0/mf)
  // m0/mf = exp(dv / (Isp * g0))
  // fuel fraction = 1 - mf/m0 = 1 - 1/exp(dv/(Isp*g0))
  const massRatio = Math.exp(deltaV / (isp * G0));
  return 1 - 1 / massRatio;
}

function getEstimatedFlightDuration(orbit: TargetOrbit): { label: string; minutes: number } {
  switch (orbit) {
    case 'LEO': return { label: '~35 min', minutes: 35 };
    case 'SSO': return { label: '~58 min', minutes: 58 };
    case 'MEO': return { label: '~3.5 hours', minutes: 210 };
    case 'GEO': return { label: '~5.5 hours (direct) / ~10 hours (GTO + apogee burn)', minutes: 330 };
    case 'TLI': return { label: '~3 days to lunar orbit', minutes: 4320 };
    case 'TMI': return { label: '~7-9 months cruise', minutes: 345600 };
    default: return { label: 'N/A', minutes: 0 };
  }
}

function getNumberOfBurns(orbit: TargetOrbit): number {
  switch (orbit) {
    case 'LEO': return 2;
    case 'SSO': return 2;
    case 'MEO': return 3;
    case 'GEO': return 3;
    case 'TLI': return 3;
    case 'TMI': return 4;
    default: return 2;
  }
}

function getMissionPhases(orbit: TargetOrbit, vehicle: LaunchVehicleData): MissionPhase[] {
  const basePhases: MissionPhase[] = [
    { time: 'T-0:00', label: 'Liftoff', description: `${vehicle.name} lifts off from launch pad`, icon: '🔥' },
    { time: 'T+2:30', label: 'MECO', description: 'Main Engine Cutoff - first stage separates', icon: '⚡' },
  ];

  if (vehicle.reusable) {
    basePhases.push({ time: 'T+6:30', label: 'Booster Landing', description: 'First stage returns for landing', icon: '🎯' });
  }

  basePhases.push({ time: 'T+8:30', label: 'SECO', description: 'Second Engine Cutoff - coast phase begins', icon: '🌑' });

  switch (orbit) {
    case 'LEO':
      basePhases.push(
        { time: 'T+32:00', label: 'Payload Deployment', description: 'Payload released into 400 km circular orbit', icon: '🛰️' },
      );
      break;
    case 'SSO':
      basePhases.push(
        { time: 'T+55:00', label: 'Payload Deployment', description: 'Payload released into 600 km sun-synchronous orbit', icon: '🛰️' },
      );
      break;
    case 'MEO':
      basePhases.push(
        { time: 'T+1:30:00', label: 'Transfer Orbit Burn', description: 'Upper stage reignites for MEO transfer', icon: '🔥' },
        { time: 'T+3:25:00', label: 'MEO Insertion', description: 'Circularization burn at 20,200 km', icon: '📡' },
        { time: 'T+3:30:00', label: 'Payload Deployment', description: 'Satellite deployed in MEO', icon: '🛰️' },
      );
      break;
    case 'GEO':
      basePhases.push(
        { time: 'T+27:00', label: 'GTO Injection', description: 'Geosynchronous Transfer Orbit insertion burn', icon: '🔥' },
        { time: 'T+5:20:00', label: 'Apogee Burn', description: 'Circularization at 35,786 km geostationary altitude', icon: '🔥' },
        { time: 'T+5:30:00', label: 'Payload Deployment', description: 'Communications satellite deployed in GEO', icon: '📡' },
      );
      break;
    case 'TLI':
      basePhases.push(
        { time: 'T+25:00', label: 'Parking Orbit', description: 'Coast in low Earth parking orbit', icon: '🌍' },
        { time: 'T+45:00', label: 'TLI Burn', description: 'Trans-Lunar Injection - escape velocity burn', icon: '🔥' },
        { time: 'T+3d', label: 'Lunar Orbit Insertion', description: 'Braking burn to enter lunar orbit', icon: '🌙' },
      );
      break;
    case 'TMI':
      basePhases.push(
        { time: 'T+25:00', label: 'Parking Orbit', description: 'Coast in low Earth parking orbit', icon: '🌍' },
        { time: 'T+50:00', label: 'TMI Burn', description: 'Trans-Mars Injection - departure burn', icon: '🔥' },
        { time: 'T+120d', label: 'Mid-Course Correction', description: 'Trajectory correction maneuver', icon: '🎯' },
        { time: 'T+7-9mo', label: 'Mars Orbit Insertion', description: 'Capture burn into Mars orbit', icon: '🔴' },
      );
      break;
  }

  return basePhases;
}

function getSuccessProbability(vehicle: LaunchVehicleData, orbit: TargetOrbit): number {
  let base = vehicle.reliability;
  // More complex orbits have slightly lower mission success
  switch (orbit) {
    case 'MEO': base *= 0.98; break;
    case 'GEO': base *= 0.96; break;
    case 'TLI': base *= 0.93; break;
    case 'TMI': base *= 0.88; break;
    default: break;
  }
  return Math.min(base, 0.99);
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatMass(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg.toLocaleString()} kg`;
}

// ════════════════════════════════════════
// Component
// ════════════════════════════════════════

export default function MissionSimulatorPage() {
  // --- Form state ---
  const [missionType, setMissionType] = useState<MissionType>('leo_satellite');
  const [vehicleId, setVehicleId] = useState<LaunchVehicleId>('falcon9');
  const [payloadMass, setPayloadMass] = useState<number>(4000);
  const [targetOrbit, setTargetOrbit] = useState<TargetOrbit>('LEO');
  const [launchSite, setLaunchSite] = useState<LaunchSite>('cape_canaveral');
  const [hasSimulated, setHasSimulated] = useState(false);

  // --- Derived data ---
  const vehicle = useMemo(() => LAUNCH_VEHICLES.find((v) => v.id === vehicleId)!, [vehicleId]);
  const orbit = useMemo(() => ORBITS[targetOrbit], [targetOrbit]);

  // --- Simulation results ---
  const results = useMemo(() => {
    const deltaV = orbit.deltaV;
    const fuelFraction = calcFuelMassFraction(deltaV, vehicle.isp);
    const flightDuration = getEstimatedFlightDuration(targetOrbit);
    const burns = getNumberOfBurns(targetOrbit);
    const successProb = getSuccessProbability(vehicle, targetOrbit);
    const phases = getMissionPhases(targetOrbit, vehicle);

    // Determine if payload exceeds capacity
    let maxCapacity = vehicle.leoCapacity;
    if (targetOrbit === 'GEO' && vehicle.gtoCapacity) {
      maxCapacity = vehicle.gtoCapacity * 0.85; // GEO is less than GTO capacity
    } else if (targetOrbit === 'MEO' && vehicle.gtoCapacity) {
      maxCapacity = vehicle.gtoCapacity * 1.1;
    } else if (targetOrbit === 'SSO') {
      maxCapacity = vehicle.leoCapacity * 0.85;
    } else if (targetOrbit === 'TLI') {
      maxCapacity = vehicle.leoCapacity * 0.35;
    } else if (targetOrbit === 'TMI') {
      maxCapacity = vehicle.leoCapacity * 0.22;
    }
    const payloadFeasible = payloadMass <= maxCapacity;
    const payloadMarginPct = payloadFeasible ? ((maxCapacity - payloadMass) / maxCapacity) * 100 : 0;

    // Cost breakdown
    const launchCost = vehicle.costM * 1_000_000;
    const integrationCost = payloadMass * 2500; // ~$2,500/kg integration
    const totalPreInsurance = launchCost + integrationCost;
    const insuranceRate = targetOrbit === 'TMI' ? 0.03 : targetOrbit === 'TLI' ? 0.025 : 0.015;
    const insuranceCost = totalPreInsurance * insuranceRate;
    const groundOpsCost = 2_500_000 + (targetOrbit === 'TMI' || targetOrbit === 'TLI' ? 3_000_000 : 500_000);
    const missionControlCost = targetOrbit === 'TMI' ? 15_000_000 : targetOrbit === 'TLI' ? 8_000_000 : 3_000_000;
    const totalCost = launchCost + integrationCost + insuranceCost + groundOpsCost + missionControlCost;

    return {
      deltaV,
      fuelFraction,
      flightDuration,
      burns,
      successProb,
      phases,
      payloadFeasible,
      payloadMarginPct,
      maxCapacity,
      costs: {
        launch: launchCost,
        integration: integrationCost,
        insurance: insuranceCost,
        insuranceRate,
        groundOps: groundOpsCost,
        missionControl: missionControlCost,
        total: totalCost,
      },
    };
  }, [vehicle, orbit, targetOrbit, payloadMass]);

  const historicalMissions = useMemo(() => HISTORICAL_MISSIONS[missionType] || [], [missionType]);

  // --- Template handler ---
  const applyTemplate = useCallback((template: MissionTemplate) => {
    setMissionType(template.missionType);
    setVehicleId(template.vehicle);
    setPayloadMass(template.payload);
    setTargetOrbit(template.orbit);
    setLaunchSite(template.site);
    setHasSimulated(true);
  }, []);

  const runSimulation = useCallback(() => {
    setHasSimulated(true);
  }, []);

  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}

        {/* Header */}
        <AnimatedPageHeader
          title="Space Mission Simulator"
          subtitle="Configure mission parameters, calculate delta-V budgets, estimate costs, and visualize mission timelines with real launch vehicle data."
          icon={<span>🚀</span>}
          accentColor="cyan"
        />

        {/* ── Pre-built Mission Templates ── */}
        <ScrollReveal className="mb-8">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Quick Templates</h2>
          <div className="flex flex-wrap gap-3">
            {MISSION_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => applyTemplate(t)}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 hover:border-white/15 bg-slate-800/60 hover:bg-slate-800 transition-all text-sm"
                title={t.description}
              >
                <span className="text-lg">{t.icon}</span>
                <div className="text-left">
                  <div className="text-slate-200 font-medium group-hover:text-white transition-colors">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ── Main Grid: Config + Results ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Configuration Panel */}
          <ScrollReveal className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                <span className="text-slate-300">&#9881;</span> Mission Configuration
              </h2>

              {/* Mission Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Mission Type</label>
                <select
                  value={missionType}
                  onChange={(e) => {
                    const mt = e.target.value as MissionType;
                    setMissionType(mt);
                    const info = MISSION_TYPES.find((m) => m.id === mt);
                    if (info) {
                      setTargetOrbit(info.defaultOrbit);
                      setVehicleId(info.defaultVehicle);
                      setPayloadMass(info.defaultPayload);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15"
                >
                  {MISSION_TYPES.map((mt) => (
                    <option key={mt.id} value={mt.id}>{mt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {MISSION_TYPES.find((m) => m.id === missionType)?.description}
                </p>
              </div>

              {/* Launch Vehicle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Launch Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value as LaunchVehicleId)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15"
                >
                  {LAUNCH_VEHICLES.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.provider})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  LEO: {formatMass(vehicle.leoCapacity)} | Cost: ${vehicle.costM}M | Isp: {vehicle.isp}s
                </p>
              </div>

              {/* Payload Mass */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Payload Mass (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={200000}
                  value={payloadMass}
                  onChange={(e) => setPayloadMass(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15"
                />
                {!results.payloadFeasible && (
                  <p className="text-xs text-red-400 mt-1">
                    Exceeds {vehicle.name} capacity of {formatMass(Math.round(results.maxCapacity))} to {targetOrbit}
                  </p>
                )}
              </div>

              {/* Target Orbit */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Target Orbit</label>
                <select
                  value={targetOrbit}
                  onChange={(e) => setTargetOrbit(e.target.value as TargetOrbit)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15"
                >
                  {(Object.keys(ORBITS) as TargetOrbit[]).map((o) => (
                    <option key={o} value={o}>{ORBITS[o].label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Altitude: {orbit.altitudeKm}</p>
              </div>

              {/* Launch Site */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Launch Site</label>
                <select
                  value={launchSite}
                  onChange={(e) => setLaunchSite(e.target.value as LaunchSite)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15"
                >
                  {(Object.keys(LAUNCH_SITES) as LaunchSite[]).map((s) => (
                    <option key={s} value={s}>{LAUNCH_SITES[s].label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Latitude: {LAUNCH_SITES[launchSite].latitude}&deg; | {LAUNCH_SITES[launchSite].country}
                </p>
              </div>

              {/* Simulate Button */}
              <button
                onClick={runSimulation}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-slate-200 to-blue-600 hover:from-white hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-black/15 hover:shadow-black/20"
              >
                Run Simulation
              </button>
            </div>
          </ScrollReveal>

          {/* RIGHT: Results */}
          <div className="lg:col-span-2 space-y-6">
            {!hasSimulated ? (
              <ScrollReveal>
                <div className="card p-12 text-center">
                  <div className="text-6xl mb-4">🛰️</div>
                  <h3 className="text-xl font-bold text-slate-200 mb-2">Configure Your Mission</h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Select mission parameters on the left panel or choose a quick template above, then click &quot;Run Simulation&quot; to see detailed results.
                  </p>
                </div>
              </ScrollReveal>
            ) : (
              <>
                {/* ── Simulation Results ── */}
                <ScrollReveal>
                  <div className="card p-6">
                    <h2 className="text-xl font-bold text-slate-100 mb-5 flex items-center gap-2">
                      <span className="text-slate-300">&#9672;</span> Simulation Results
                      {!results.payloadFeasible && (
                        <span className="ml-2 px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded-full border border-red-700/50">
                          Payload Exceeds Capacity
                        </span>
                      )}
                    </h2>

                    <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <StaggerItem>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Delta-V Required</p>
                          <p className="text-2xl font-bold text-slate-300">{(results.deltaV / 1000).toFixed(1)} km/s</p>
                          <p className="text-xs text-slate-500 mt-1">{results.deltaV.toLocaleString()} m/s</p>
                        </div>
                      </StaggerItem>

                      <StaggerItem>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Flight Duration</p>
                          <p className="text-2xl font-bold text-emerald-400">{results.flightDuration.label}</p>
                          <p className="text-xs text-slate-500 mt-1">To {orbit.label.split(' (')[0]}</p>
                        </div>
                      </StaggerItem>

                      <StaggerItem>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Engine Burns</p>
                          <p className="text-2xl font-bold text-amber-400">{results.burns}</p>
                          <p className="text-xs text-slate-500 mt-1">Propulsive maneuvers</p>
                        </div>
                      </StaggerItem>

                      <StaggerItem>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fuel Mass Fraction</p>
                          <p className="text-2xl font-bold text-purple-400">{(results.fuelFraction * 100).toFixed(1)}%</p>
                          <p className="text-xs text-slate-500 mt-1">Of total vehicle mass</p>
                        </div>
                      </StaggerItem>

                      <StaggerItem>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Success Probability</p>
                          <p className={`text-2xl font-bold ${results.successProb >= 0.95 ? 'text-emerald-400' : results.successProb >= 0.9 ? 'text-amber-400' : 'text-red-400'}`}>
                            {(results.successProb * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Based on {vehicle.name} reliability</p>
                        </div>
                      </StaggerItem>

                      <StaggerItem>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Payload Margin</p>
                          <p className={`text-2xl font-bold ${results.payloadFeasible ? 'text-emerald-400' : 'text-red-400'}`}>
                            {results.payloadFeasible ? `${results.payloadMarginPct.toFixed(0)}%` : 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {results.payloadFeasible ? `${formatMass(Math.round(results.maxCapacity - payloadMass))} spare` : 'Over capacity'}
                          </p>
                        </div>
                      </StaggerItem>
                    </StaggerContainer>
                  </div>
                </ScrollReveal>

                {/* ── Mission Timeline ── */}
                <ScrollReveal>
                  <div className="card p-6">
                    <h2 className="text-xl font-bold text-slate-100 mb-5 flex items-center gap-2">
                      <span className="text-slate-300">&#9202;</span> Mission Timeline
                    </h2>

                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-white/60 via-blue-500/40 to-transparent" />

                      <div className="space-y-4">
                        {results.phases.map((phase, idx) => (
                          <div key={idx} className="relative flex gap-4 pl-2">
                            {/* Timeline dot */}
                            <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full bg-slate-800 border-2 border-white/15 flex items-center justify-center text-lg">
                              {phase.icon}
                            </div>
                            {/* Phase card */}
                            <div className="flex-1 bg-slate-800/40 rounded-lg border border-slate-700/50 p-3 hover:border-white/10 transition-colors">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-xs font-mono text-slate-300 bg-slate-900/50 px-2 py-0.5 rounded">{phase.time}</span>
                                <h4 className="text-sm font-semibold text-slate-200">{phase.label}</h4>
                              </div>
                              <p className="text-xs text-slate-400">{phase.description}</p>

        <RelatedModules modules={PAGE_RELATIONS['mission-simulator']} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* ── Cost Breakdown ── */}
                <ScrollReveal>
                  <div className="card p-6">
                    <h2 className="text-xl font-bold text-slate-100 mb-5 flex items-center gap-2">
                      <span className="text-slate-300">&#128176;</span> Cost Breakdown
                    </h2>

                    <div className="space-y-3">
                      {[
                        { label: 'Launch Cost', value: results.costs.launch, description: `${vehicle.name} launch services` },
                        { label: 'Payload Integration', value: results.costs.integration, description: `${formatMass(payloadMass)} at ~$2,500/kg` },
                        { label: 'Insurance Estimate', value: results.costs.insurance, description: `${(results.costs.insuranceRate * 100).toFixed(1)}% of mission value` },
                        { label: 'Ground Operations', value: results.costs.groundOps, description: 'Launch site ops, range fees, logistics' },
                        { label: 'Mission Control', value: results.costs.missionControl, description: 'Flight operations, tracking, telemetry' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-4 py-3 border border-slate-700/30">
                          <div>
                            <p className="text-sm text-slate-300 font-medium">{item.label}</p>
                            <p className="text-xs text-slate-500">{item.description}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-200 tabular-nums">{formatCurrency(item.value)}</p>
                        </div>
                      ))}

                      {/* Total */}
                      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800/30 to-blue-900/30 rounded-lg px-4 py-4 border border-white/10 mt-2">
                        <div>
                          <p className="text-base font-bold text-slate-100">Total Mission Cost</p>
                          <p className="text-xs text-slate-400">All-inclusive estimate</p>
                        </div>
                        <p className="text-xl font-bold text-slate-300 tabular-nums">{formatCurrency(results.costs.total)}</p>
                      </div>

                      {/* Cost per kg */}
                      <div className="text-center pt-2">
                        <p className="text-xs text-slate-500">
                          Cost per kg to {orbit.label.split(' (')[0]}:{' '}
                          <span className="text-slate-300 font-semibold">
                            {formatCurrency(results.costs.total / payloadMass)}/kg
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* ── Historical Comparison ── */}
                <ScrollReveal>
                  <div className="card p-6">
                    <h2 className="text-xl font-bold text-slate-100 mb-5 flex items-center gap-2">
                      <span className="text-slate-300">&#128218;</span> Similar Historical Missions
                    </h2>

                    <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {historicalMissions.map((mission) => (
                        <StaggerItem key={mission.name}>
                          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600/60 transition-colors h-full">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-semibold text-slate-200">{mission.name}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                mission.outcome === 'success'
                                  ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/40'
                                  : mission.outcome === 'partial'
                                  ? 'bg-amber-900/50 text-amber-400 border border-amber-700/40'
                                  : 'bg-red-900/50 text-red-400 border border-red-700/40'
                              }`}>
                                {mission.outcome === 'success' ? 'Success' : mission.outcome === 'partial' ? 'Partial' : 'Failure'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                              <span>{mission.year}</span>
                              <span className="text-slate-700">|</span>
                              <span>{mission.vehicle}</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">
                              <span className="text-slate-500">Payload:</span> {mission.payload}
                            </p>
                            <p className="text-xs text-slate-500">{mission.notes}</p>
                          </div>
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  </div>
                </ScrollReveal>

                {/* ── Vehicle Specs Card ── */}
                <ScrollReveal>
                  <div className="card p-6">
                    <h2 className="text-xl font-bold text-slate-100 mb-5 flex items-center gap-2">
                      <span className="text-slate-300">&#128640;</span> {vehicle.name} Specifications
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Provider', value: vehicle.provider },
                        { label: 'LEO Capacity', value: formatMass(vehicle.leoCapacity) },
                        { label: 'GTO Capacity', value: vehicle.gtoCapacity ? formatMass(vehicle.gtoCapacity) : 'N/A' },
                        { label: 'Launch Cost', value: `$${vehicle.costM}M` },
                        { label: 'Specific Impulse', value: `${vehicle.isp}s` },
                        { label: 'Stages', value: String(vehicle.stages) },
                        { label: 'Reusable', value: vehicle.reusable ? 'Yes' : 'No' },
                        { label: 'Reliability', value: `${(vehicle.reliability * 100).toFixed(0)}%` },
                      ].map((spec) => (
                        <div key={spec.label} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                          <p className="text-xs text-slate-500 mb-1">{spec.label}</p>
                          <p className="text-sm font-semibold text-slate-200">{spec.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Delta-V bar visualization */}
                    <div className="mt-5">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Delta-V Budget Utilization</p>
                      <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            results.fuelFraction > 0.95 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                            results.fuelFraction > 0.85 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                            'bg-gradient-to-r from-white to-blue-500'
                          }`}
                          style={{ width: `${Math.min(results.fuelFraction * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0%</span>
                        <span>Fuel: {(results.fuelFraction * 100).toFixed(1)}% of vehicle mass</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </>
            )}
          </div>
        </div>

        {/* ── Explore More ── */}
        <ScrollReveal className="mt-12">
          <section className="mt-16 border-t border-slate-800 pt-8">
            <h2 className="text-xl font-bold text-white mb-6">Explore More</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/orbital-calculator" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Orbital Calculator</h3>
                <p className="text-slate-400 text-sm mt-1">Calculate orbital parameters, transfer orbits, and delta-V budgets.</p>
              </a>
              <a href="/thermal-calculator" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Thermal Calculator</h3>
                <p className="text-slate-400 text-sm mt-1">Model spacecraft thermal environments and heat dissipation requirements.</p>
              </a>
              <a href="/radiation-calculator" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Radiation Calculator</h3>
                <p className="text-slate-400 text-sm mt-1">Estimate radiation exposure across orbital regimes and shielding levels.</p>
              </a>
              <a href="/launch-economics" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Launch Economics</h3>
                <p className="text-slate-400 text-sm mt-1">Cost analysis and market trends for orbital launch vehicles.</p>
              </a>
              <a href="/constellation-designer" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Constellation Designer</h3>
                <p className="text-slate-400 text-sm mt-1">Design satellite constellations with coverage analysis and optimization.</p>
              </a>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
