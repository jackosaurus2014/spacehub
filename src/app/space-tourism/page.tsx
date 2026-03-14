'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TourismCard from '@/components/tourism/TourismCard';
import ComparisonModal from '@/components/tourism/ComparisonModal';
import { clientLogger } from '@/lib/client-logger';
import {
  SpaceTourismOffering,
  EXPERIENCE_TYPES,
  TOURISM_PROVIDERS,
  TOURISM_STATUS_LABELS,
  TOURISM_STATS,
  TOURISM_MILESTONES,
  QUICK_COMPARISON_TABLE,
  FUTURE_DESTINATIONS,
  ExperienceType,
  TourismStatus,
} from '@/lib/space-tourism-data';

// Price range options
const PRICE_RANGES = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under $500K', min: 0, max: 500000 },
  { label: '$500K - $10M', min: 500000, max: 10000000 },
  { label: '$10M - $60M', min: 10000000, max: 60000000 },
  { label: 'Over $50M', min: 50000000, max: undefined },
];

// Glass card style helper
const glassCard = {
  background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.85) 100%)'
};

// Active tab sections
const TAB_SECTIONS = [
  { id: 'providers', label: 'Providers', icon: '🚀' },
  { id: 'comparison', label: 'Comparison Table', icon: '📊' },
  { id: 'statistics', label: 'Industry Stats', icon: '📈' },
  { id: 'timeline', label: 'Timeline', icon: '🕐' },
  { id: 'destinations', label: 'Future Destinations', icon: '🌌' },
] as const;

type TabSection = typeof TAB_SECTIONS[number]['id'];

// Detail Modal Component
function DetailModal({
  isOpen,
  onClose,
  offering,
}: {
  isOpen: boolean;
  onClose: () => void;
  offering: SpaceTourismOffering | null;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !offering) return null;

  const statusInfo = TOURISM_STATUS_LABELS[offering.status] || { label: offering.status || 'Unknown', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
  const experienceInfo = EXPERIENCE_TYPES.find((e) => e.value === offering.experienceType);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl animate-scale-in"
        style={{
          background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.98) 0%, rgba(10, 10, 10, 0.96) 100%)'
        }}
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />

        {/* Header */}
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.06] flex items-center justify-center text-2xl font-bold text-slate-300 border border-white/[0.1]">
                {offering.logoIcon}
              </div>
              <div>
                <p className="text-slate-300 text-sm font-medium">{offering.provider}</p>
                <h2 className="text-2xl font-display font-bold text-white">{offering.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] text-slate-300 text-xs font-medium">
                    <span>{experienceInfo?.icon}</span>
                    {experienceInfo?.label}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price & Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.04] rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Price</p>
              <p className="text-slate-300 font-bold text-xl">{offering.priceDisplay}</p>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Duration</p>
              <p className="text-white font-semibold">{offering.duration}</p>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Altitude</p>
              <p className="text-white font-semibold">{offering.altitudeDisplay}</p>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-4 text-center">
              <p className="text-slate-400 text-xs mb-1">Passengers</p>
              <p className="text-white font-semibold">{offering.maxPassengers}</p>
            </div>
          </div>

          {/* G-Forces & Weightlessness */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-lg p-4 border border-amber-500/20">
              <p className="text-amber-400 text-xs font-medium mb-1">G-Forces Experienced</p>
              <p className="text-white font-semibold">{offering.gForces}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-lg p-4 border border-purple-500/20">
              <p className="text-purple-400 text-xs font-medium mb-1">Weightlessness Duration</p>
              <p className="text-white font-semibold">{offering.weightlessDuration}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-white font-semibold mb-2">About This Experience</h3>
            <p className="text-slate-300 leading-relaxed">{offering.description}</p>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-white font-semibold mb-3">What&apos;s Included</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(offering.features || []).map((feature, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-white font-semibold mb-3">Requirements</h3>
            <div className="space-y-2">
              {(offering.requirements || []).map((req, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-slate-400">{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mission Details */}
          <div className="bg-white/[0.04] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">Mission Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Vehicle:</span>
                <span className="text-white ml-2">{offering.vehicleName}</span>
              </div>
              <div>
                <span className="text-slate-400">Launch Site:</span>
                <span className="text-white ml-2">{offering.launchSite}</span>
              </div>
              <div>
                <span className="text-slate-400">Training:</span>
                <span className="text-white ml-2">{offering.trainingDuration}</span>
              </div>
              <div>
                <span className="text-slate-400">First Flight:</span>
                <span className="text-white ml-2">{offering.firstFlight || 'TBD'}</span>
              </div>
              <div>
                <span className="text-slate-400">Completed Flights:</span>
                <span className="text-white ml-2">{offering.totalFlights !== null ? offering.totalFlights : 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400">Headquarters:</span>
                <span className="text-white ml-2">{offering.headquarters}</span>
              </div>
              {offering.founded && (
                <div>
                  <span className="text-slate-400">Founded:</span>
                  <span className="text-white ml-2">{offering.founded}</span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-slate-400">Safety:</span>
                <span className="text-white ml-2">{offering.safetyRecord}</span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <a
            href={offering.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-4 rounded-lg bg-gradient-to-r from-white to-blue-500 text-white font-semibold text-center hover:from-slate-300 hover:to-blue-400 transition-all shadow-lg shadow-black/15"
          >
            Visit {offering.provider} Website
          </a>
        </div>
      </div>
    </div>
  );
}

// Industry Statistics Section
function IndustryStatisticsSection() {
  const stats = TOURISM_STATS;

  const statCards = [
    { label: 'Space Tourists to Date', value: stats.totalTouristsLabel, color: 'text-slate-300', subtext: 'Since Dennis Tito (2001)' },
    { label: 'Revenue Projection (2030)', value: stats.revenueProjection2030, color: 'text-green-400', subtext: `Growing at ${stats.marketGrowthRate}` },
    { label: 'Total Industry Investment', value: stats.totalInvestment, color: 'text-white/70', subtext: 'Across all providers' },
    { label: 'Active Providers', value: `${stats.activeProviders}`, color: 'text-blue-400', subtext: `${stats.plannedProviders} more planned` },
    { label: 'Countries Represented', value: `${stats.countriesRepresented}`, color: 'text-amber-400', subtext: 'Nations with space tourists' },
    { label: 'First Space Tourist Cost', value: stats.firstSpaceTouristCost, color: 'text-rose-400', subtext: stats.firstSpaceTourist },
  ];

  const experienceStats = [
    { label: 'Suborbital Training', value: stats.averageSuborbitalTraining, icon: '🚀' },
    { label: 'Orbital Training', value: stats.averageOrbitalTraining, icon: '🛰️' },
    { label: 'G-Forces Range', value: stats.gForcesRange, icon: '💪' },
    { label: 'Suborbital Weightlessness', value: stats.weightlessnessSuborbital, icon: '🪶' },
    { label: 'Orbital Weightlessness', value: stats.weightlessnessOrbital, icon: '✨' },
    { label: 'Youngest Tourist', value: stats.youngestTourist, icon: '👦' },
    { label: 'Oldest Tourist', value: stats.oldestTourist, icon: '👵' },
  ];

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <ScrollReveal>
        <h3 className="text-xl font-display font-bold text-white mb-6">Space Tourism by the Numbers</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-5"
              style={glassCard}
            >
              <div className={`text-3xl font-display font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-white text-sm font-medium mb-1">{stat.label}</div>
              <div className="text-slate-400 text-xs">{stat.subtext}</div>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Experience Details */}
      <ScrollReveal delay={0.15}>
        <h3 className="text-xl font-display font-bold text-white mb-6">The Space Tourism Experience</h3>
        <div
          className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-6"
          style={glassCard}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {experienceStats.map((stat) => (
              <div key={stat.label} className="flex items-start gap-3 bg-white/[0.04] rounded-lg p-4">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{stat.value}</p>
                  <p className="text-slate-400 text-xs">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Market Trajectory */}
      <ScrollReveal delay={0.2}>
        <div
          className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-6"
          style={glassCard}
        >
          <h3 className="text-lg font-display font-bold text-white mb-4">Market Growth Trajectory</h3>
          <div className="space-y-4">
            {[
              { year: '2020', value: '$0.3B', width: '10%', color: 'from-slate-500 to-slate-600' },
              { year: '2023', value: '$0.8B', width: '27%', color: 'from-blue-500 to-blue-600' },
              { year: '2025', value: '$1.2B', width: '40%', color: 'from-white to-slate-300' },
              { year: '2027', value: '$1.8B', width: '60%', color: 'from-purple-500 to-purple-600' },
              { year: '2030', value: '$3.0B', width: '100%', color: 'from-green-500 to-green-600' },
            ].map((bar) => (
              <div key={bar.year} className="flex items-center gap-4">
                <span className="text-slate-400 text-sm font-mono w-12">{bar.year}</span>
                <div className="flex-1 bg-white/[0.04] rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${bar.color} rounded-full flex items-center justify-end pr-3 transition-all duration-1000`}
                    style={{ width: bar.width }}
                  >
                    <span className="text-white text-xs font-bold">{bar.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs mt-4">
            Source: Industry estimates. Space tourism market projected to reach $3B+ by 2030 at 17.1% CAGR.
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}

// Comparison Table Section
function ComparisonTableSection() {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterType, setFilterType] = useState<ExperienceType | ''>('');
  const [filterStatus, setFilterStatus] = useState<TourismStatus | ''>('');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(column);
      setSortAsc(true);
    }
  };

  let filteredData = [...QUICK_COMPARISON_TABLE];
  if (filterType) {
    filteredData = filteredData.filter((row) => row.type === filterType);
  }
  if (filterStatus) {
    filteredData = filteredData.filter((row) => row.status === filterStatus);
  }

  if (sortColumn) {
    filteredData.sort((a, b) => {
      const aVal = a[sortColumn as keyof typeof a];
      const bVal = b[sortColumn as keyof typeof b];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  const statusColors: Record<TourismStatus, string> = {
    active: 'text-green-400',
    upcoming: 'text-blue-400',
    sold_out: 'text-yellow-400',
    future: 'text-purple-400',
  };

  return (
    <ScrollReveal>
      <div
        className="backdrop-blur-xl rounded-xl border border-white/[0.06] overflow-hidden"
        style={glassCard}
      >
        {/* Table Header */}
        <div className="p-6 border-b border-white/[0.06]">
          <h3 className="text-xl font-display font-bold text-white mb-2">
            Complete Experience Comparison
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Compare all {QUICK_COMPARISON_TABLE.length} space tourism offerings side by side. Click column headers to sort.
          </p>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ExperienceType | '')}
              className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-white/30 outline-none"
            >
              <option value="">All Types</option>
              {EXPERIENCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TourismStatus | '')}
              className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-white/30 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="upcoming">Coming Soon</option>
              <option value="future">Future</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.04]">
                {[
                  { key: 'provider', label: 'Provider' },
                  { key: 'vehicle', label: 'Vehicle' },
                  { key: 'type', label: 'Type' },
                  { key: 'altitude', label: 'Altitude' },
                  { key: 'duration', label: 'Duration' },
                  { key: 'gForces', label: 'G-Forces' },
                  { key: 'training', label: 'Training' },
                  { key: 'price', label: 'Price' },
                  { key: 'seats', label: 'Seats' },
                  { key: 'status', label: 'Status' },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-slate-300 font-medium cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={sortAsc ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                        </svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => {
                const expInfo = EXPERIENCE_TYPES.find((e) => e.value === row.type);
                return (
                  <tr
                    key={`${row.provider}-${row.vehicle}-${idx}`}
                    className={`border-t border-white/[0.06] hover:bg-white/[0.04] transition-colors ${
                      idx % 2 === 0 ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{row.provider}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{row.vehicle}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <span>{expInfo?.icon}</span>
                        {expInfo?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{row.altitude}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{row.duration}</td>
                    <td className="px-4 py-3 text-amber-400 font-medium whitespace-nowrap">{row.gForces}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{row.training}</td>
                    <td className="px-4 py-3 text-slate-300 font-bold whitespace-nowrap">{row.price}</td>
                    <td className="px-4 py-3 text-white text-center">{row.seats}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-medium ${statusColors[row.status]}`}>
                        {(TOURISM_STATUS_LABELS[row.status] || { label: 'Unknown' }).label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400">No offerings match the selected filters.</p>
          </div>
        )}

        <div className="p-4 border-t border-white/[0.06]">
          <p className="text-slate-400 text-xs">
            Showing {filteredData.length} of {QUICK_COMPARISON_TABLE.length} offerings. Prices are estimates and subject to change.
          </p>
        </div>
      </div>
    </ScrollReveal>
  );
}

// Timeline Section
function TimelineSection() {
  return (
    <ScrollReveal>
      <div
        className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-6"
        style={glassCard}
      >
        <h3 className="text-xl font-display font-bold text-white mb-2">
          Space Tourism Timeline
        </h3>
        <p className="text-slate-400 text-sm mb-8">
          Key milestones in the evolution of commercial space tourism, from the first space tourist to the future of orbital hotels.
        </p>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-white/50 via-purple-500/50 to-slate-700/50" />

          <div className="space-y-8">
            {TOURISM_MILESTONES.map((milestone, idx) => {
              const isPast = milestone.year <= 2025;
              const isCurrent = milestone.year === 2026;
              return (
                <div key={`${milestone.year}-${idx}`} className="relative flex gap-6">
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center text-xl border-2 ${
                    isCurrent
                      ? 'bg-white/10 border-white/10 shadow-lg shadow-black/15'
                      : isPast
                        ? 'bg-white/[0.06] border-white/[0.1]'
                        : 'bg-purple-500/10 border-purple-500/30'
                  }`}>
                    {milestone.icon}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-2 ${isCurrent ? '' : ''}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-sm font-mono font-bold ${
                        isCurrent ? 'text-slate-300' : isPast ? 'text-slate-300' : 'text-purple-400'
                      }`}>
                        {milestone.year}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-medium border border-white/10">
                          Current
                        </span>
                      )}
                      {!isPast && !isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <h4 className="text-white font-semibold mb-1">{milestone.event}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{milestone.significance}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

// Future Destinations Section
function FutureDestinationsSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusColors = {
    in_development: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', label: 'In Development' },
    conceptual: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Conceptual' },
    far_future: { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400', label: 'Far Future' },
  };

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div
          className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-6"
          style={glassCard}
        >
          <h3 className="text-xl font-display font-bold text-white mb-2">
            Future Destinations
          </h3>
          <p className="text-slate-400 text-sm">
            Beyond today&apos;s suborbital hops and ISS visits, the future of space tourism holds incredible destinations.
            From lunar flybys to orbital hotels, Mars expeditions to asteroid visits -- here is what awaits.
          </p>
        </div>
      </ScrollReveal>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {FUTURE_DESTINATIONS.map((dest) => {
          const isExpanded = expandedId === dest.id;
          const status = statusColors[dest.status];
          return (
            <StaggerItem key={dest.id}>
              <div
                className="backdrop-blur-xl rounded-xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.08]"
                style={glassCard}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{dest.icon}</span>
                      <div>
                        <h4 className="text-white font-display font-bold text-lg">{dest.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-400 text-xs font-mono">{dest.timeline}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className={`text-slate-300 text-sm leading-relaxed mb-4 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {dest.description}
                  </p>

                  {/* Key Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/[0.04] rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Estimated Cost</p>
                      <p className="text-slate-300 font-semibold text-sm">{dest.estimatedCost}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Distance</p>
                      <p className="text-white font-semibold text-sm">{dest.distance}</p>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Key Players */}
                      <div>
                        <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Key Players</p>
                        <div className="flex flex-wrap gap-2">
                          {dest.keyPlayers.map((player) => (
                            <span
                              key={player}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-300 text-xs border border-white/[0.06]"
                            >
                              {player}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Challenges */}
                      <div>
                        <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Key Challenges</p>
                        <div className="space-y-2">
                          {dest.challenges.map((challenge, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span className="text-slate-400">{challenge}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Toggle Button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : dest.id)}
                    className="mt-4 text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    {isExpanded ? 'Show Less' : 'Learn More'}
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </div>
  );
}


// Main Content Component
function SpaceTourismContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [offerings, setOfferings] = useState<SpaceTourismOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [detailOffering, setDetailOffering] = useState<SpaceTourismOffering | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabSection>('providers');

  // Filters from URL
  const providerFilter = searchParams.get('provider') || '';
  const experienceFilter = (searchParams.get('experience') || '') as ExperienceType | '';
  const priceRangeIndex = parseInt(searchParams.get('priceRange') || '0');
  const tabParam = searchParams.get('tab') as TabSection | null;

  // Sync tab from URL
  useEffect(() => {
    if (tabParam && TAB_SECTIONS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // URL update helper
  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (!value || value === '0') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Tab handler
  const handleTabChange = (tab: TabSection) => {
    setActiveTab(tab);
    updateUrl({ tab: tab === 'providers' ? '' : tab });
  };

  // Filter handlers
  const handleProviderChange = (provider: string) => {
    updateUrl({ provider });
  };

  const handleExperienceChange = (experience: string) => {
    updateUrl({ experience });
  };

  const handlePriceRangeChange = (index: string) => {
    updateUrl({ priceRange: index });
  };

  // Comparison handlers
  const handleToggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleRemoveFromCompare = (id: string) => {
    setSelectedForCompare((prev) => prev.filter((i) => i !== id));
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        const params = new URLSearchParams();
        if (providerFilter) params.set('provider', providerFilter);
        if (experienceFilter) params.set('experienceType', experienceFilter);

        const priceRange = PRICE_RANGES[priceRangeIndex];
        if (priceRange.min !== undefined) params.set('minPrice', priceRange.min.toString());
        if (priceRange.max !== undefined) params.set('maxPrice', priceRange.max.toString());

        const res = await fetch(`/api/space-tourism?${params.toString()}`);
        const data = await res.json();

        if (!data.error) {
          setOfferings(data.offerings || []);
        }
      } catch (error) {
        clientLogger.error('Failed to fetch space tourism data', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providerFilter, experienceFilter, priceRangeIndex]);

  // Get selected offerings for comparison
  const comparisonOfferings = offerings.filter((o) => selectedForCompare.includes(o.id));

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Tourism Marketplace"
          subtitle="The comprehensive guide to commercial space travel -- compare providers, explore experiences, and discover the future of tourism beyond Earth"
          icon="🎫"
          accentColor="purple"
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Hero Stats Bar */}
            <ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                {[
                  { label: 'Total Offerings', value: offerings.length.toString(), color: 'text-slate-300' },
                  { label: 'Active Programs', value: offerings.filter((o) => o.status === 'active').length.toString(), color: 'text-green-400' },
                  { label: 'Providers', value: TOURISM_PROVIDERS.length.toString(), color: 'text-white/70' },
                  { label: 'Starting From', value: '$50K', color: 'text-white' },
                  { label: 'Space Tourists', value: TOURISM_STATS.totalTouristsLabel, color: 'text-amber-400' },
                  { label: 'Market (2030)', value: TOURISM_STATS.revenueProjection2030, color: 'text-green-400' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-4 text-center"
                    style={glassCard}
                  >
                    <div className={`text-2xl font-display font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Tab Navigation */}
            <ScrollReveal delay={0.05}>
              <div
                className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-2 mb-8"
                style={glassCard}
              >
                <div className="flex flex-wrap gap-1">
                  {TAB_SECTIONS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-white/5 to-blue-500/20 text-slate-300 border border-white/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* === PROVIDERS TAB === */}
            {activeTab === 'providers' && (
              <>
                {/* Filter Bar */}
                <ScrollReveal><div
                  className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-4 mb-8"
                  style={glassCard}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Provider Filter */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-slate-400 text-xs mb-1.5">Provider</label>
                      <select
                        value={providerFilter}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                      >
                        <option value="">All Providers ({TOURISM_PROVIDERS.length})</option>
                        {TOURISM_PROVIDERS.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Experience Type Filter */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-slate-400 text-xs mb-1.5">Experience Type</label>
                      <select
                        value={experienceFilter}
                        onChange={(e) => handleExperienceChange(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                      >
                        <option value="">All Types</option>
                        {EXPERIENCE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price Range Filter */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-slate-400 text-xs mb-1.5">Price Range</label>
                      <select
                        value={priceRangeIndex}
                        onChange={(e) => handlePriceRangeChange(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                      >
                        {PRICE_RANGES.map((range, i) => (
                          <option key={i} value={i}>
                            {range.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Compare Button */}
                    <div className="flex items-end">
                      <button
                        onClick={() => setShowComparison(true)}
                        disabled={selectedForCompare.length < 2}
                        className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                          selectedForCompare.length >= 2
                            ? 'bg-gradient-to-r from-white to-blue-500 text-white shadow-lg shadow-black/15 hover:shadow-black/20'
                            : 'bg-white/[0.08] text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Compare ({selectedForCompare.length})
                      </button>
                    </div>
                  </div>

                  {/* Selected for comparison indicator */}
                  {selectedForCompare.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 text-sm">Selected:</span>
                        {selectedForCompare.map((id) => {
                          const offering = offerings.find((o) => o.id === id);
                          if (!offering) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-medium border border-white/10"
                            >
                              {offering.name}
                              <button
                                onClick={() => handleToggleCompare(id)}
                                className="hover:text-white transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          );
                        })}
                        <button
                          onClick={() => setSelectedForCompare([])}
                          className="text-slate-400 hover:text-white text-xs transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                  )}
                </div></ScrollReveal>

                {/* Offerings Grid */}
                {offerings.length === 0 ? (
                  <div
                    className="backdrop-blur-xl rounded-xl border border-white/[0.06] p-12 text-center"
                    style={glassCard}
                  >
                    <span className="text-6xl block mb-4">🚀</span>
                    <h3 className="text-xl font-semibold text-white mb-2">No Experiences Found</h3>
                    <p className="text-slate-400">
                      Try adjusting your filters to see more space tourism options.
                    </p>
                  </div>
                ) : (
                  <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offerings.map((offering) => (
                      <StaggerItem key={offering.id}>
                        <TourismCard
                          offering={offering}
                          isSelected={selectedForCompare.includes(offering.id)}
                          onToggleCompare={handleToggleCompare}
                          onLearnMore={setDetailOffering}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}

                {/* Experience Type Guide */}
                <ScrollReveal><div
                  className="mt-12 backdrop-blur-xl rounded-xl border border-white/[0.06] p-6"
                  style={glassCard}
                >
                  <h3 className="text-lg font-display font-bold text-white mb-4">
                    Understanding Space Tourism Options
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {EXPERIENCE_TYPES.map((type) => (
                      <div key={type.value} className="bg-white/[0.04] rounded-lg p-4">
                        <div className="text-2xl mb-2">{type.icon}</div>
                        <h4 className="text-white font-semibold text-sm mb-1">{type.label}</h4>
                        <p className="text-slate-400 text-xs">{type.description}</p>
                      </div>
                    ))}
                  </div>
                </div></ScrollReveal>
              </>
            )}

            {/* === COMPARISON TABLE TAB === */}
            {activeTab === 'comparison' && (
              <ComparisonTableSection />
            )}

            {/* === STATISTICS TAB === */}
            {activeTab === 'statistics' && (
              <IndustryStatisticsSection />
            )}

            {/* === TIMELINE TAB === */}
            {activeTab === 'timeline' && (
              <TimelineSection />
            )}

            {/* === FUTURE DESTINATIONS TAB === */}
            {activeTab === 'destinations' && (
              <FutureDestinationsSection />
            )}

            {/* Disclaimer */}
            <div className="mt-8 text-center">
              <p className="text-slate-400 text-sm">
                Prices and availability are subject to change. All information is provided for educational purposes.
                Please visit official provider websites for the most current details. Data current as of February 2026.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        offerings={comparisonOfferings}
        onRemove={handleRemoveFromCompare}
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!detailOffering}
        onClose={() => setDetailOffering(null)}
        offering={detailOffering}
      />
    </div>
  );
}

// Main Page with Suspense
export default function SpaceTourismPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4">
            <PageHeader
              title="Space Tourism Marketplace"
              subtitle="Compare and explore commercial space travel experiences from leading providers"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Space Tourism' }]}
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>

            <ScrollReveal>
              <RelatedModules
                modules={[
              { name: 'Business Opportunities', description: 'Space industry contracts and RFPs', href: '/business-opportunities', icon: '📋' },
              { name: 'Cislunar Economy', description: 'Earth-Moon tourism and commerce', href: '/cislunar', icon: '🌙' },
              { name: 'Mars Planner', description: 'Future Mars tourism missions', href: '/mars-planner', icon: '🔴' },
              { name: 'Space Agencies', description: 'Government programs and partnerships', href: '/space-agencies', icon: '🏛️' },
                ]}
              />
            </ScrollReveal>

          </div>
        </div>
      }
    >
      <SpaceTourismContent />
    </Suspense>
  );
}
