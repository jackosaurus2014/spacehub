'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type BlueprintCategory = 'engine' | 'satellite_bus' | 'lander' | 'spacecraft';
type BlueprintStatus = 'operational' | 'development' | 'retired' | 'proposed';

interface BlueprintSpecifications {
  // Engine specs
  thrust?: number;
  thrustVacuum?: number;
  isp?: number;
  ispVacuum?: number;
  cycleType?: string;
  throttleRange?: string;
  massFlowRate?: number;
  chamberPressure?: number;
  nozzleRatio?: number;
  restartCapability?: boolean;
  gimbalRange?: number;

  // Satellite bus specs
  dryMass?: number;
  maxPayloadMass?: number;
  power?: number;
  designLife?: number;
  propulsion?: string;
  attitude?: string;
  dataRate?: number;
  stationkeeping?: string;
  dimensions?: string;

  // Lander specs
  landingMass?: number;
  payloadCapacity?: number;
  payloadVolume?: number;
  landingAccuracy?: string;
  surfaceOperations?: string;

  // Common specs
  height?: number;
  diameter?: number;
  mass?: number;
  cost?: number;
}

interface Blueprint {
  id: string;
  slug: string;
  name: string;
  category: BlueprintCategory;
  manufacturer: string;
  specifications: BlueprintSpecifications;
  propellantType?: string;
  firstFlight?: string;
  missionsFlown?: number;
  keyInnovations: string[];
  description: string;
  technicalNotes?: string;
  imageUrl?: string;
  diagramUrl?: string;
  sourceUrls: string[];
  status: BlueprintStatus;
}

interface BlueprintStats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byManufacturer: { manufacturer: string; count: number }[];
  totalMissionsFlown: number;
}

type TabId = 'all' | 'engines' | 'buses' | 'landers';

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string; category?: BlueprintCategory }[] = [
  { id: 'all', label: 'All Blueprints', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'engines', label: 'Rocket Engines', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z', category: 'engine' },
  { id: 'buses', label: 'Satellite Buses', icon: 'M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z', category: 'satellite_bus' },
  { id: 'landers', label: 'Lunar Landers', icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z', category: 'lander' },
];

const STATUS_STYLES: Record<BlueprintStatus, { label: string; color: string; bg: string }> = {
  operational: { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/20' },
  development: { label: 'In Development', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  retired: { label: 'Retired', color: 'text-slate-400', bg: 'bg-slate-800/40' },
  proposed: { label: 'Proposed', color: 'text-blue-400', bg: 'bg-blue-900/20' },
};

const CATEGORY_INFO: Record<BlueprintCategory, { label: string; icon: string }> = {
  engine: { label: 'Rocket Engine', icon: 'M' },
  satellite_bus: { label: 'Satellite Bus', icon: 'S' },
  lander: { label: 'Lunar Lander', icon: 'L' },
  spacecraft: { label: 'Spacecraft', icon: 'C' },
};

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'propellantType', label: 'Propellant' },
  { key: 'status', label: 'Status' },
  { key: 'missionsFlown', label: 'Missions Flown' },
  { key: 'firstFlight', label: 'First Flight' },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '-';
  return n.toLocaleString();
}

function getCategoryIcon(category: BlueprintCategory): string {
  switch (category) {
    case 'engine': return 'M';
    case 'satellite_bus': return 'S';
    case 'lander': return 'L';
    case 'spacecraft': return 'C';
    default: return '?';
  }
}

function getCategoryEmoji(category: BlueprintCategory): string {
  switch (category) {
    case 'engine': return '..';
    case 'satellite_bus': return '..';
    case 'lander': return '..';
    case 'spacecraft': return '..';
    default: return '..';
  }
}

function getSourceCitation(blueprint: Blueprint): string {
  const manufacturer = blueprint.manufacturer;
  const category = blueprint.category;

  // Manufacturer-specific citation sources
  const manufacturerSources: Record<string, string> = {
    'SpaceX': 'SpaceX published specifications',
    'Blue Origin': 'Blue Origin published specifications',
    'Aerojet Rocketdyne': 'Aerojet Rocketdyne technical data sheets',
    'Rocket Lab': 'Rocket Lab published specifications',
    'Relativity Space': 'Relativity Space published specifications',
    'Firefly Aerospace': 'Firefly Aerospace published specifications',
    'NPO Energomash': 'NPO Energomash / Roscosmos technical publications',
    'Maxar Technologies': 'Maxar Technologies spacecraft platform data',
    'Airbus Defence and Space': 'Airbus Defence and Space product documentation',
    'Northrop Grumman': 'Northrop Grumman Space Systems specifications',
    'Ball Aerospace': 'Ball Aerospace mission documentation',
    'York Space Systems': 'York Space Systems platform specifications',
    'Thales Alenia Space': 'Thales Alenia Space product documentation',
    'Intuitive Machines': 'Intuitive Machines mission data',
    'Astrobotic Technology': 'Astrobotic Technology mission documentation',
    'ispace': 'ispace mission documentation',
    'CNSA/CASC': 'China National Space Administration publications',
    'ISRO': 'Indian Space Research Organisation mission data',
  };

  const knownSource = manufacturerSources[manufacturer];
  if (knownSource) {
    return knownSource;
  }

  // Category-based fallback citations
  switch (category) {
    case 'engine':
      return `Based on publicly available specifications from ${manufacturer}`;
    case 'satellite_bus':
      return `Based on publicly available specifications from ${manufacturer}`;
    case 'lander':
      return `Based on publicly available specifications from ${manufacturer}`;
    case 'spacecraft':
      return `Based on publicly available specifications from ${manufacturer}`;
    default:
      return `Based on publicly available specifications from ${manufacturer}`;
  }
}

// ────────────────────────────────────────
// Blueprint Card Component
// ────────────────────────────────────────

function BlueprintCard({ blueprint, onClick }: { blueprint: Blueprint; onClick: () => void }) {
  const statusStyle = STATUS_STYLES[blueprint.status];
  const specs = blueprint.specifications;

  return (
    <div
      onClick={onClick}
      className="card p-5 border border-slate-200 hover:border-nebula-500/50 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-nebula-500/20 to-rocket-500/20 flex items-center justify-center text-xl font-bold text-nebula-300">
            {getCategoryIcon(blueprint.category)}
          </div>
          <div>
            <h3 className="text-slate-900 font-semibold text-lg group-hover:text-nebula-600 transition-colors">
              {blueprint.name}
            </h3>
            <span className="text-slate-400 text-sm">{blueprint.manufacturer}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.color}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm mb-4 leading-relaxed line-clamp-2">
        {blueprint.description}
      </p>

      {/* Key Specs Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {blueprint.category === 'engine' && (
          <>
            {specs.thrustVacuum && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Thrust (Vacuum)</span>
                <span className="text-sm font-semibold text-slate-900">{formatNumber(specs.thrustVacuum)} kN</span>
              </div>
            )}
            {specs.ispVacuum && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Isp (Vacuum)</span>
                <span className="text-sm font-semibold text-slate-900">{formatNumber(specs.ispVacuum)} s</span>
              </div>
            )}
            {specs.cycleType && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Cycle Type</span>
                <span className="text-sm font-semibold text-slate-900 truncate block">{specs.cycleType}</span>
              </div>
            )}
            {blueprint.propellantType && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Propellant</span>
                <span className="text-sm font-semibold text-slate-900 truncate block">{blueprint.propellantType}</span>
              </div>
            )}
          </>
        )}
        {blueprint.category === 'satellite_bus' && (
          <>
            {specs.power && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Power</span>
                <span className="text-sm font-semibold text-slate-900">{formatNumber(specs.power)} W</span>
              </div>
            )}
            {specs.designLife && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Design Life</span>
                <span className="text-sm font-semibold text-slate-900">{specs.designLife} years</span>
              </div>
            )}
            {specs.dryMass && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Dry Mass</span>
                <span className="text-sm font-semibold text-slate-900">{formatNumber(specs.dryMass)} kg</span>
              </div>
            )}
            {specs.maxPayloadMass && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Max Payload</span>
                <span className="text-sm font-semibold text-slate-900">{formatNumber(specs.maxPayloadMass)} kg</span>
              </div>
            )}
          </>
        )}
        {blueprint.category === 'lander' && (
          <>
            {specs.payloadCapacity && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Payload Capacity</span>
                <span className="text-sm font-semibold text-slate-900">{formatNumber(specs.payloadCapacity)} kg</span>
              </div>
            )}
            {specs.landingMass && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Landing Mass</span>
                <span className="text-sm font-semibold text-slate-900">{formatNumber(specs.landingMass)} kg</span>
              </div>
            )}
            {blueprint.propellantType && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Propellant</span>
                <span className="text-sm font-semibold text-slate-900 truncate block">{blueprint.propellantType}</span>
              </div>
            )}
            {specs.landingAccuracy && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg">
                <span className="text-xs text-slate-400 block">Landing Accuracy</span>
                <span className="text-sm font-semibold text-slate-900">{specs.landingAccuracy}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-4 text-sm">
          {blueprint.firstFlight && (
            <span className="text-slate-400">
              First Flight: <span className="text-slate-700 font-medium">{formatDate(blueprint.firstFlight)}</span>
            </span>
          )}
        </div>
        {blueprint.missionsFlown !== undefined && blueprint.missionsFlown > 0 && (
          <span className="text-xs bg-nebula-100 text-nebula-700 px-2 py-1 rounded-full font-medium">
            {formatNumber(blueprint.missionsFlown)} missions
          </span>
        )}
      </div>

      {/* Source Citation */}
      <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-700/50">
        Source: {getSourceCitation(blueprint)}
      </p>
    </div>
  );
}

// ────────────────────────────────────────
// Blueprint Detail Modal
// ────────────────────────────────────────

function BlueprintDetailModal({
  blueprint,
  onClose,
}: {
  blueprint: Blueprint;
  onClose: () => void;
}) {
  const statusStyle = STATUS_STYLES[blueprint.status];
  const specs = blueprint.specifications;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-nebula-500/20 to-rocket-500/20 flex items-center justify-center text-2xl font-bold text-nebula-300">
                {getCategoryIcon(blueprint.category)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{blueprint.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-slate-500">{blueprint.manufacturer}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                    {statusStyle.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Overview</h3>
              <p className="text-slate-600 leading-relaxed">{blueprint.description}</p>
            </div>

            {/* Technical Notes */}
            {blueprint.technicalNotes && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Technical Notes</h3>
                <p className="text-slate-600 leading-relaxed">{blueprint.technicalNotes}</p>
              </div>
            )}

            {/* Specifications */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {blueprint.category === 'engine' && (
                  <>
                    {specs.thrust && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Thrust (Sea Level)</span>
                        <span className="text-lg font-bold text-slate-900">{formatNumber(specs.thrust)} kN</span>
                      </div>
                    )}
                    {specs.thrustVacuum && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Thrust (Vacuum)</span>
                        <span className="text-lg font-bold text-slate-900">{formatNumber(specs.thrustVacuum)} kN</span>
                      </div>
                    )}
                    {specs.isp && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Isp (Sea Level)</span>
                        <span className="text-lg font-bold text-slate-900">{specs.isp} s</span>
                      </div>
                    )}
                    {specs.ispVacuum && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Isp (Vacuum)</span>
                        <span className="text-lg font-bold text-slate-900">{specs.ispVacuum} s</span>
                      </div>
                    )}
                    {specs.cycleType && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Engine Cycle</span>
                        <span className="text-lg font-bold text-slate-900">{specs.cycleType}</span>
                      </div>
                    )}
                    {specs.chamberPressure && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Chamber Pressure</span>
                        <span className="text-lg font-bold text-slate-900">{specs.chamberPressure} bar</span>
                      </div>
                    )}
                    {specs.throttleRange && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Throttle Range</span>
                        <span className="text-lg font-bold text-slate-900">{specs.throttleRange}</span>
                      </div>
                    )}
                    {specs.mass && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Engine Mass</span>
                        <span className="text-lg font-bold text-slate-900">{formatNumber(specs.mass)} kg</span>
                      </div>
                    )}
                    {specs.nozzleRatio && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Nozzle Expansion Ratio</span>
                        <span className="text-lg font-bold text-slate-900">{specs.nozzleRatio}:1</span>
                      </div>
                    )}
                    {specs.gimbalRange !== undefined && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Gimbal Range</span>
                        <span className="text-lg font-bold text-slate-900">{specs.gimbalRange} deg</span>
                      </div>
                    )}
                    {specs.restartCapability !== undefined && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Restart Capable</span>
                        <span className="text-lg font-bold text-slate-900">{specs.restartCapability ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                  </>
                )}

                {blueprint.category === 'satellite_bus' && (
                  <>
                    {specs.power && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Power Output</span>
                        <span className="text-lg font-bold text-slate-900">{formatNumber(specs.power)} W</span>
                      </div>
                    )}
                    {specs.designLife && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Design Life</span>
                        <span className="text-lg font-bold text-slate-900">{specs.designLife} years</span>
                      </div>
                    )}
                    {specs.dryMass && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Dry Mass</span>
                        <span className="text-lg font-bold text-slate-900">{formatNumber(specs.dryMass)} kg</span>
                      </div>
                    )}
                    {specs.maxPayloadMass && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Max Payload Mass</span>
                        <span className="text-lg font-bold text-slate-900">{formatNumber(specs.maxPayloadMass)} kg</span>
                      </div>
                    )}
                    {specs.propulsion && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Propulsion</span>
                        <span className="text-lg font-bold text-slate-900">{specs.propulsion}</span>
                      </div>
                    )}
                    {specs.attitude && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Attitude Control</span>
                        <span className="text-lg font-bold text-slate-900">{specs.attitude}</span>
                      </div>
                    )}
                    {specs.dimensions && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Dimensions</span>
                        <span className="text-lg font-bold text-slate-900">{specs.dimensions}</span>
                      </div>
                    )}
                  </>
                )}

                {blueprint.category === 'lander' && (
                  <>
                    {specs.landingMass && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Landing Mass</span>
                        <span className="text-lg font-bold text-slate-900">{formatNumber(specs.landingMass)} kg</span>
                      </div>
                    )}
                    {specs.payloadCapacity && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Payload Capacity</span>
                        <span className="text-lg font-bold text-slate-900">{formatNumber(specs.payloadCapacity)} kg</span>
                      </div>
                    )}
                    {specs.height && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Height</span>
                        <span className="text-lg font-bold text-slate-900">{specs.height} m</span>
                      </div>
                    )}
                    {specs.diameter && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Diameter</span>
                        <span className="text-lg font-bold text-slate-900">{specs.diameter} m</span>
                      </div>
                    )}
                    {specs.propulsion && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Propulsion</span>
                        <span className="text-lg font-bold text-slate-900">{specs.propulsion}</span>
                      </div>
                    )}
                    {specs.landingAccuracy && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <span className="text-xs text-slate-500 block mb-1">Landing Accuracy</span>
                        <span className="text-lg font-bold text-slate-900">{specs.landingAccuracy}</span>
                      </div>
                    )}
                    {specs.surfaceOperations && (
                      <div className="bg-slate-50 p-4 rounded-lg col-span-2">
                        <span className="text-xs text-slate-500 block mb-1">Surface Operations</span>
                        <span className="text-lg font-bold text-slate-900">{specs.surfaceOperations}</span>
                      </div>
                    )}
                  </>
                )}

                {blueprint.propellantType && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <span className="text-xs text-slate-500 block mb-1">Propellant</span>
                    <span className="text-lg font-bold text-slate-900">{blueprint.propellantType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Innovations */}
            {blueprint.keyInnovations && blueprint.keyInnovations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Key Innovations</h3>
                <ul className="space-y-2">
                  {blueprint.keyInnovations.map((innovation, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-nebula-100 text-nebula-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="text-slate-600">{innovation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mission Info */}
            <div className="grid grid-cols-2 gap-4">
              {blueprint.firstFlight && (
                <div className="bg-nebula-50 p-4 rounded-lg">
                  <span className="text-xs text-nebula-600 block mb-1">First Flight</span>
                  <span className="text-lg font-bold text-nebula-900">{formatDate(blueprint.firstFlight)}</span>
                </div>
              )}
              {blueprint.missionsFlown !== undefined && blueprint.missionsFlown > 0 && (
                <div className="bg-rocket-50 p-4 rounded-lg">
                  <span className="text-xs text-rocket-600 block mb-1">Missions Flown</span>
                  <span className="text-lg font-bold text-rocket-900">{formatNumber(blueprint.missionsFlown)}</span>
                </div>
              )}
            </div>

            {/* Sources */}
            {blueprint.sourceUrls && blueprint.sourceUrls.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">References</h3>
                <div className="space-y-2">
                  {blueprint.sourceUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-nebula-600 hover:text-nebula-700 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {new URL(url).hostname}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Stats Cards Component
// ────────────────────────────────────────

function StatsCards({ stats }: { stats: BlueprintStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="card p-4">
        <span className="text-xs text-slate-500 block mb-1">Total Blueprints</span>
        <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
      </div>
      <div className="card p-4">
        <span className="text-xs text-slate-500 block mb-1">Rocket Engines</span>
        <span className="text-2xl font-bold text-nebula-600">{stats.byCategory['engine'] || 0}</span>
      </div>
      <div className="card p-4">
        <span className="text-xs text-slate-500 block mb-1">Satellite Buses</span>
        <span className="text-2xl font-bold text-rocket-600">{stats.byCategory['satellite_bus'] || 0}</span>
      </div>
      <div className="card p-4">
        <span className="text-xs text-slate-500 block mb-1">Total Missions</span>
        <span className="text-2xl font-bold text-green-600">{formatNumber(stats.totalMissionsFlown)}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Content Component
// ────────────────────────────────────────

function BlueprintsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [stats, setStats] = useState<BlueprintStats | null>(null);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activeTab = (searchParams.get('tab') as TabId) || 'all';
  const selectedManufacturer = searchParams.get('manufacturer') || '';
  const selectedStatus = searchParams.get('status') as BlueprintStatus | null;

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const tab = TABS.find(t => t.id === activeTab);
        const category = tab?.category;

        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (selectedManufacturer) params.set('manufacturer', selectedManufacturer);
        if (selectedStatus) params.set('status', selectedStatus);
        if (searchTerm) params.set('search', searchTerm);

        const response = await fetch(`/api/blueprints?${params.toString()}`);
        const data = await response.json();

        if (data.error) {
          console.error('API error:', data.error);
        } else {
          setBlueprints(data.blueprints || []);
          setStats(data.stats || null);
          setManufacturers(data.manufacturers || []);
        }
      } catch (error) {
        console.error('Failed to fetch blueprints:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab, selectedManufacturer, selectedStatus, searchTerm]);

  return (
    <>
      <AnimatedPageHeader
        title="Blueprint Series"
        subtitle="Technical breakdowns of space hardware - rocket engines, satellite buses, and lunar landers"
        icon="📐"
        accentColor="cyan"
      >
        <ExportButton
          data={blueprints}
          columns={EXPORT_COLUMNS}
          filename={`blueprints-${activeTab}`}
        />
      </AnimatedPageHeader>

      {stats && <StatsCards stats={stats} />}

      {/* Tabs */}
      <div className="border-b border-slate-500/30 mb-6">
        <nav className="flex gap-8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => updateParams({ tab: tab.id === 'all' ? null : tab.id })}
              className={`flex items-center gap-2 py-4 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-nebula-500 text-nebula-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                  : 'border-transparent text-slate-200 hover:text-white hover:border-slate-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search blueprints..."
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:border-transparent"
          />
        </div>

        {/* Manufacturer Filter */}
        <select
          value={selectedManufacturer}
          onChange={(e) => updateParams({ manufacturer: e.target.value || null })}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:border-transparent bg-white"
        >
          <option value="">All Manufacturers</option>
          {manufacturers.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus || ''}
          onChange={(e) => updateParams({ status: e.target.value || null })}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:border-transparent bg-white"
        >
          <option value="">All Statuses</option>
          <option value="operational">Operational</option>
          <option value="development">In Development</option>
          <option value="retired">Retired</option>
          <option value="proposed">Proposed</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!loading && blueprints.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">--</div>
          <h3 className="text-lg font-medium text-white mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">No blueprints found</h3>
          <p className="text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {searchTerm || selectedManufacturer || selectedStatus
              ? 'Try adjusting your filters'
              : 'Initialize the database to get started'}
          </p>
        </div>
      )}

      {/* Blueprint Grid */}
      {!loading && blueprints.length > 0 && (
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {blueprints.map(blueprint => (
            <StaggerItem key={blueprint.id}>
              <BlueprintCard
                blueprint={blueprint}
                onClick={() => setSelectedBlueprint(blueprint)}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Detail Modal */}
      {selectedBlueprint && (
        <BlueprintDetailModal
          blueprint={selectedBlueprint}
          onClose={() => setSelectedBlueprint(null)}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function BlueprintsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <BlueprintsContent />
      </Suspense>
    </div>
  );
}
