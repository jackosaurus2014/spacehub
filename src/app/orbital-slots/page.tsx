'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  OrbitalSlot,
  SatelliteOperator,
  OrbitalEvent,
  OrbitType,
  CongestionLevel,
  OrbitalEventType,
  SatellitePurpose,
  ORBIT_TYPES,
  CONGESTION_LEVEL_INFO,
  SATELLITE_PURPOSE_INFO,
  COUNTRY_INFO,
  ORBITAL_SERVICE_CATEGORIES,
  ORBITAL_PRICING_MODELS,
  ORBITAL_SERVICE_AVAILABILITY,
  ORBITAL_CUSTOMER_TYPES,
  ORBITAL_SERVICE_TYPES,
  type OrbitalService,
  type OrbitalServiceContract,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SkeletonPage } from '@/components/ui/Skeleton';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';
import ServiceListingDialog from '@/components/ui/ServiceListingDialog';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface OrbitalData {
  slots: OrbitalSlot[];
  operators: SatelliteOperator[];
  events: OrbitalEvent[];
  stats: {
    totalActive: number;
    totalInactive: number;
    totalDebris: number;
    totalObjects: number;
    projected1Year: number;
    projected5Year: number;
    growth1Year: number;
    growth5Year: number;
    topOperators: { name: string; count: number; constellation: string | null }[];
    upcomingLaunches: number;
  };
}

interface ServiceStats {
  totalServices: number;
  activeServices: number;
  totalContracts: number;
  totalContractValue: number;
  avgContractValue: number;
  servicesByCategory: Record<string, number>;
  uniqueProviders: number;
}

type TabId = 'overview' | 'operators' | 'events' | 'services' | 'contracts' | 'pricing' | 'request';

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const CONGESTION_STYLES: Record<CongestionLevel, { bg: string; text: string; border: string; barColor: string }> = {
  low: { bg: 'bg-green-900/20', text: 'text-green-400', border: 'border-green-500/30', barColor: 'from-green-500 to-green-400' },
  moderate: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-500/30', barColor: 'from-yellow-500 to-yellow-400' },
  high: { bg: 'bg-orange-900/20', text: 'text-orange-400', border: 'border-orange-500/30', barColor: 'from-orange-500 to-orange-400' },
  critical: { bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-500/30', barColor: 'from-red-500 to-red-400' },
};

const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'text-green-400' },
  limited: { label: 'Limited', color: 'text-yellow-400' },
  scarce: { label: 'Scarce', color: 'text-orange-400' },
  full: { label: 'Full', color: 'text-red-400' },
};

const EVENT_TYPE_STYLES: Record<OrbitalEventType, { label: string; icon: string; color: string; bg: string }> = {
  launch: { label: 'Launch', icon: '\u{1F680}', color: 'text-green-400', bg: 'bg-green-900/20' },
  reentry: { label: 'Re-entry', icon: '\u{2604}\u{FE0F}', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  conjunction: { label: 'Conjunction', icon: '\u{26A0}\u{FE0F}', color: 'text-red-400', bg: 'bg-red-900/20' },
  debris_event: { label: 'Debris Event', icon: '\u{1F4A5}', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  maneuver: { label: 'Maneuver', icon: '\u{1F504}', color: 'text-blue-400', bg: 'bg-blue-900/20' },
};

const CONFIDENCE_STYLES: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmed', color: 'text-green-400' },
  tentative: { label: 'Tentative', color: 'text-yellow-400' },
  estimated: { label: 'Estimated', color: 'text-orange-400' },
};

const COUNTRY_FLAGS: Record<string, string> = {
  USA: '\u{1F1FA}\u{1F1F8}',
  UK: '\u{1F1EC}\u{1F1E7}',
  China: '\u{1F1E8}\u{1F1F3}',
  France: '\u{1F1EB}\u{1F1F7}',
  Luxembourg: '\u{1F1F1}\u{1F1FA}',
  Germany: '\u{1F1E9}\u{1F1EA}',
  Japan: '\u{1F1EF}\u{1F1F5}',
  India: '\u{1F1EE}\u{1F1F3}',
  Russia: '\u{1F1F7}\u{1F1FA}',
  Canada: '\u{1F1E8}\u{1F1E6}',
};

// ── Export column definitions ──

const OPERATOR_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'country', label: 'Country' },
  { key: 'constellationName', label: 'Constellation' },
  { key: 'primaryPurpose', label: 'Orbit Type' },
  { key: 'totalActive', label: 'Total Active' },
  { key: 'leoCount', label: 'LEO Count' },
  { key: 'meoCount', label: 'MEO Count' },
  { key: 'geoCount', label: 'GEO Count' },
  { key: 'planned1Year', label: 'Planned 1 Year' },
  { key: 'planned5Year', label: 'Planned 5 Year' },
];

const EVENT_EXPORT_COLUMNS = [
  { key: 'missionName', label: 'Name' },
  { key: 'eventType', label: 'Type' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'expectedDate', label: 'Date' },
  { key: 'operatorName', label: 'Operator' },
  { key: 'satelliteCount', label: 'Satellites' },
  { key: 'dateConfidence', label: 'Confidence' },
  { key: 'description', label: 'Description' },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function getOperatorOrbitBreakdown(op: SatelliteOperator): { type: string; count: number }[] {
  const orbits: { type: string; count: number }[] = [];
  if (op.leoCount > 0) orbits.push({ type: 'LEO', count: op.leoCount });
  if (op.meoCount > 0) orbits.push({ type: 'MEO', count: op.meoCount });
  if (op.geoCount > 0) orbits.push({ type: 'GEO', count: op.geoCount });
  if (op.otherCount > 0) orbits.push({ type: 'Other', count: op.otherCount });
  return orbits;
}

function getGrowthPercent(current: number, planned: number): number {
  if (current === 0) return planned > 0 ? 100 : 0;
  return (planned / current) * 100;
}

function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Service helper functions ──

function getCategoryInfo(category: string) {
  return ORBITAL_SERVICE_CATEGORIES.find(c => c.value === category) || {
    icon: '?',
    label: category,
    description: '',
  };
}

function getAvailabilityInfo(availability: string) {
  return ORBITAL_SERVICE_AVAILABILITY.find(a => a.value === availability) || {
    label: availability,
    color: 'bg-gray-500',
  };
}

function getServiceTypeInfo(serviceType: string) {
  return ORBITAL_SERVICE_TYPES.find(t => t.value === serviceType) || {
    value: serviceType,
    label: serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon: '\u{1F4E6}',
    category: 'earth_observation' as const,
  };
}

function groupServicesByType(services: OrbitalService[]) {
  const grouped: Record<string, OrbitalService[]> = {};

  services.forEach(service => {
    const typeKey = service.serviceType;
    if (!grouped[typeKey]) {
      grouped[typeKey] = [];
    }
    grouped[typeKey].push(service);
  });

  const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
    const typeA = getServiceTypeInfo(keyA);
    const typeB = getServiceTypeInfo(keyB);
    const catOrderA = ORBITAL_SERVICE_CATEGORIES.findIndex(c => c.value === typeA.category);
    const catOrderB = ORBITAL_SERVICE_CATEGORIES.findIndex(c => c.value === typeB.category);
    if (catOrderA !== catOrderB) return catOrderA - catOrderB;
    return typeA.label.localeCompare(typeB.label);
  });

  return sortedGroups;
}

function formatPrice(service: OrbitalService): string {
  if (service.pricingModel === 'custom') return 'Contact for Quote';
  if (!service.priceMin && !service.priceMax) return 'Contact for Quote';

  const unit = service.priceUnit || '';
  if (service.priceMin && service.priceMax && service.priceMin !== service.priceMax) {
    return `$${service.priceMin.toLocaleString()}-${service.priceMax.toLocaleString()} ${unit}`;
  }
  if (service.priceMin) {
    return `$${service.priceMin.toLocaleString()} ${unit}`;
  }
  if (service.priceMax) {
    return `$${service.priceMax.toLocaleString()} ${unit}`;
  }
  return 'Contact for Quote';
}

function formatContractValue(value: number | null): string {
  if (!value) return 'Undisclosed';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

// ────────────────────────────────────────
// Orbit Type Card (Overview Tab)
// ────────────────────────────────────────

function OrbitTypeCard({ slot }: { slot: OrbitalSlot }) {
  const orbitInfo = ORBIT_TYPES.find(o => o.value === slot.orbitType);
  const congestion = slot.congestionLevel ? CONGESTION_STYLES[slot.congestionLevel] : null;
  const congestionInfo = slot.congestionLevel ? CONGESTION_LEVEL_INFO[slot.congestionLevel] : null;
  const availability = slot.slotAvailability ? AVAILABILITY_LABELS[slot.slotAvailability] : null;
  const totalSatellites = slot.activeSatellites + slot.inactiveSatellites;
  const utilization = totalSatellites > 0 ? (slot.activeSatellites / totalSatellites) * 100 : 0;
  const totalObjects = totalSatellites + slot.debrisCount;

  return (
    <div className={`card p-5 border ${congestion?.border || 'border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{orbitInfo?.icon || '\u{1F6F0}\u{FE0F}'}</span>
          <div>
            <h3 className="text-slate-900 font-semibold text-lg">{slot.orbitName}</h3>
            <span className="text-slate-400 text-sm">{orbitInfo?.altitude || 'N/A'}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {congestionInfo && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${congestion?.bg} ${congestion?.text} border ${congestion?.border}`}>
              {congestionInfo.label} Congestion
            </span>
          )}
          {availability && (
            <span className={`text-xs ${availability.color}`}>
              Slots: {availability.label}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {slot.description && (
        <p className="text-slate-400 text-sm mb-4 leading-relaxed">{slot.description}</p>
      )}

      {/* Utilization Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Active Utilization</span>
          <span className="text-slate-900 text-sm font-bold">{utilization.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${congestion?.barColor || 'from-nebula-500 to-nebula-400'} rounded-full transition-all`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-100/50 rounded-lg p-3 text-center">
          <div className="text-slate-900 font-bold text-lg">{formatNumber(slot.activeSatellites)}</div>
          <div className="text-slate-400 text-xs">Active</div>
        </div>
        <div className="bg-slate-100/50 rounded-lg p-3 text-center">
          <div className="text-yellow-400 font-bold text-lg">{formatNumber(slot.inactiveSatellites)}</div>
          <div className="text-slate-400 text-xs">Inactive</div>
        </div>
        <div className="bg-slate-100/50 rounded-lg p-3 text-center">
          <div className="text-red-400 font-bold text-lg">{formatNumber(slot.debrisCount)}</div>
          <div className="text-slate-400 text-xs">Debris</div>
        </div>
      </div>

      {/* Projections */}
      <div className="flex items-center gap-4 pt-3 border-t border-slate-200 text-sm">
        <div className="flex-1">
          <span className="text-slate-400 text-xs">1-Year Forecast</span>
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 font-semibold">{formatNumber(slot.projected1Year)}</span>
            <span className="text-green-400/60 text-xs">
              (+{formatNumber(slot.projected1Year - slot.activeSatellites)})
            </span>
          </div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div className="flex-1">
          <span className="text-slate-400 text-xs">5-Year Forecast</span>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-semibold">{formatNumber(slot.projected5Year)}</span>
            <span className="text-blue-400/60 text-xs">
              (+{formatNumber(slot.projected5Year - slot.activeSatellites)})
            </span>
          </div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div className="flex-1">
          <span className="text-slate-400 text-xs">Total Objects</span>
          <div className="text-slate-900 font-semibold">{formatNumber(totalObjects)}</div>
        </div>
      </div>

      {/* Cross-module link */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <Link
          href="/debris-monitor?tab=overview"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
        >
          View debris in this orbit &rarr;
        </Link>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Operator Card (Operators Tab)
// ────────────────────────────────────────

function OperatorCard({ operator, rank }: { operator: SatelliteOperator; rank: number }) {
  const purposeInfo = operator.primaryPurpose ? SATELLITE_PURPOSE_INFO[operator.primaryPurpose] : null;
  const orbitBreakdown = getOperatorOrbitBreakdown(operator);
  const flag = COUNTRY_FLAGS[operator.country] || '\u{1F30D}';
  const growth1Y = getGrowthPercent(operator.totalActive, operator.planned1Year);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100/50 flex items-center justify-center text-2xl border border-slate-200">
            {flag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-slate-900 font-semibold">{operator.name}</h3>
              <span className="text-slate-400 text-xs">#{rank}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">{operator.country}</span>
              {operator.constellationName && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className="text-nebula-300 text-xs">{operator.constellationName}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {purposeInfo && (
          <span className="text-xs px-2.5 py-1 rounded bg-slate-100/50 text-slate-500 border border-slate-200 flex items-center gap-1">
            <span>{purposeInfo.icon}</span>
            {purposeInfo.label}
          </span>
        )}
      </div>

      {/* Fleet Size */}
      <div className="bg-slate-100/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Active Fleet</span>
          <span className="text-slate-900 text-2xl font-bold font-display">{formatNumber(operator.totalActive)}</span>
        </div>

        {/* Orbit Breakdown */}
        {orbitBreakdown.length > 0 && (
          <div className="space-y-2">
            {orbitBreakdown.map((orbit) => {
              const pct = operator.totalActive > 0 ? (orbit.count / operator.totalActive) * 100 : 0;
              return (
                <div key={orbit.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 text-xs">{orbit.type}</span>
                    <span className="text-slate-400 text-xs">{formatNumber(orbit.count)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Growth Projections */}
      <div className="flex items-center gap-4 pt-3 border-t border-slate-200 text-sm">
        <div className="flex-1">
          <span className="text-slate-400 text-xs">1-Year Planned</span>
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 font-semibold">+{formatNumber(operator.planned1Year)}</span>
            {operator.totalActive > 0 && (
              <span className="text-green-400/60 text-xs">
                ({growth1Y.toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div className="flex-1">
          <span className="text-slate-400 text-xs">5-Year Planned</span>
          <div className="text-blue-400 font-semibold">+{formatNumber(operator.planned5Year)}</div>
        </div>
      </div>

      {/* Cross-module links */}
      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
        <Link
          href="/debris-monitor?tab=objects"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
        >
          View Debris &rarr;
        </Link>
        <Link
          href={`/market-intel?search=${encodeURIComponent(operator.name)}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/30"
        >
          Company Intel &rarr;
        </Link>
        {operator.primaryPurpose === 'internet' && (
          <Link
            href="/spectrum"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-rocket-500/20 text-rocket-300 hover:bg-rocket-500/30 transition-colors border border-rocket-500/30"
          >
            Spectrum Filings &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Event Card (Events Tab)
// ────────────────────────────────────────

function EventCard({ event }: { event: OrbitalEvent }) {
  const eventStyle = EVENT_TYPE_STYLES[event.eventType] || EVENT_TYPE_STYLES.launch;
  const confidence = event.dateConfidence ? CONFIDENCE_STYLES[event.dateConfidence] : null;
  const eventDate = new Date(event.expectedDate);
  const days = daysUntil(event.expectedDate);
  const isPast = days < 0;
  const isConjunction = event.eventType === 'conjunction';

  return (
    <div className={`card p-5 border ${isPast ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${eventStyle.bg} flex items-center justify-center text-xl border border-slate-200`}>
            {eventStyle.icon}
          </div>
          <div>
            <h4 className="text-slate-900 font-semibold">{event.missionName || 'Unknown Mission'}</h4>
            <div className="flex items-center gap-2 text-sm">
              <span className={`${eventStyle.color} text-xs font-medium`}>{eventStyle.label}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-400 text-xs">{event.orbitType}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-slate-900 font-medium text-sm">
            {eventDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className={`text-xs ${isPast ? 'text-slate-400' : days <= 3 ? 'text-green-400' : 'text-slate-400'}`}>
            {isPast ? 'Completed' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {event.operatorName && (
          <div className="bg-slate-100/50 rounded px-3 py-1.5 text-sm">
            <span className="text-slate-400 text-xs block">Operator</span>
            <span className="text-slate-900 font-medium">{event.operatorName}</span>
          </div>
        )}
        <div className="bg-slate-100/50 rounded px-3 py-1.5 text-sm">
          <span className="text-slate-400 text-xs block">Satellites</span>
          <span className="text-slate-900 font-medium">{event.satelliteCount}</span>
        </div>
        {confidence && (
          <div className="bg-slate-100/50 rounded px-3 py-1.5 text-sm">
            <span className="text-slate-400 text-xs block">Confidence</span>
            <span className={`font-medium ${confidence.color}`}>{confidence.label}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-slate-400 text-xs leading-relaxed">{event.description}</p>
      )}

      {/* Cross-module link for conjunction events */}
      {isConjunction && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <Link
            href="/debris-monitor?tab=conjunctions"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
          >
            View in Debris Monitor &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (needs useSearchParams)
// ────────────────────────────────────────

function OrbitalManagementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const initialOrbit = (searchParams.get('orbit') as OrbitType | '') || '';

  const [data, setData] = useState<OrbitalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [orbitFilter, setOrbitFilter] = useState<OrbitType | ''>(initialOrbit);

  // ── Services state ──
  const [servicesData, setServicesData] = useState<OrbitalService[]>([]);
  const [contracts, setContracts] = useState<OrbitalServiceContract[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [pricingModelFilter, setPricingModelFilter] = useState<string>('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('');
  const [showListingDialog, setShowListingDialog] = useState(false);

  // Request form state
  const [requestForm, setRequestForm] = useState({
    email: '',
    companyName: '',
    category: '',
    serviceType: '',
    description: '',
    budget: '',
    timeline: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Determine if the current tab is a services-related tab
  const isServicesTab = activeTab === 'services' || activeTab === 'contracts' || activeTab === 'pricing' || activeTab === 'request';

  // Sync state changes to URL
  const updateUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || (key === 'tab' && value === 'overview')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    updateUrl({ tab, orbit: '' });
    setOrbitFilter('');
  };

  const handleOrbitFilterChange = (orbit: OrbitType | '') => {
    setOrbitFilter(orbit);
    updateUrl({ orbit });
  };

  // ── Orbital slots data fetching ──
  const fetchData = async () => {
    try {
      const res = await fetch('/api/orbital-slots');
      const result = await res.json();

      if (!result.error) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch orbital data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/orbital-slots/init', { method: 'POST' });
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize orbital data:', error);
    } finally {
      setInitializing(false);
    }
  };

  // ── Services data fetching ──
  const fetchServicesData = async () => {
    try {
      setServicesLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (pricingModelFilter) params.append('pricingModel', pricingModelFilter);

      const res = await fetch(`/api/orbital-services?${params}`);
      const svcData = await res.json();

      if (!res.ok) throw new Error(svcData.error);

      setServicesData(svcData.services || []);
      setServiceStats(svcData.stats || null);
      setServicesError(null);
    } catch (err) {
      setServicesError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const params = new URLSearchParams();
      if (customerTypeFilter) params.append('customerType', customerTypeFilter);

      const res = await fetch(`/api/orbital-services/contracts?${params}`);
      const cData = await res.json();

      if (!res.ok) throw new Error(cData.error);

      setContracts(cData.contracts || []);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/orbital-services/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm),
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error);
      }

      setSubmitted(true);
      setRequestForm({
        email: '',
        companyName: '',
        category: '',
        serviceType: '',
        description: '',
        budget: '',
        timeline: '',
      });
    } catch (err) {
      setServicesError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch services data when entering services-related tabs or when filters change
  useEffect(() => {
    if (activeTab === 'services' || activeTab === 'pricing' || activeTab === 'request') {
      fetchServicesData();
    }
  }, [activeTab, categoryFilter, pricingModelFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'contracts') {
      fetchContracts();
    }
  }, [activeTab, customerTypeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const slots = data?.slots || [];
  const operators = data?.operators || [];
  const events = data?.events || [];
  const stats = data?.stats;
  const needsInit = !loading && !stats && slots.length === 0 && operators.length === 0;

  // Filtered operators by orbit type
  const filteredOperators = orbitFilter
    ? operators.filter((op) => {
        if (orbitFilter === 'LEO') return op.leoCount > 0;
        if (orbitFilter === 'MEO') return op.meoCount > 0;
        if (orbitFilter === 'GEO') return op.geoCount > 0;
        return op.otherCount > 0;
      })
    : operators;

  // Find most congested orbit
  const mostCongestedSlot = slots.reduce<OrbitalSlot | null>((worst, slot) => {
    if (!worst) return slot;
    const order: Record<string, number> = { critical: 3, high: 2, moderate: 1, low: 0 };
    const worstLevel = worst.congestionLevel ? order[worst.congestionLevel] ?? -1 : -1;
    const currentLevel = slot.congestionLevel ? order[slot.congestionLevel] ?? -1 : -1;
    return currentLevel > worstLevel ? slot : worst;
  }, null);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Orbital Management"
          subtitle="Track orbital congestion, satellite operators, fleet compositions, upcoming events, and satellite-based services across all regimes"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Orbital Management' }]}
        />

        {loading && !isServicesTab ? (
          <SkeletonPage statCards={4} contentCards={3} />
        ) : needsInit && !isServicesTab ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">&#128752;</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              No Orbital Data Available
            </h2>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              Load orbital slot data including satellite registries, operator fleets,
              and upcoming orbital events.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="btn-primary py-3 px-8"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading Data...
                </span>
              ) : (
                'Load Data'
              )}
            </button>
          </div>
        ) : (
          <>
            {/* ──────────────── Quick Stats Banner ──────────────── */}
            {!isServicesTab && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-slate-900">
                    {formatNumber(stats?.totalActive || 0)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Active Satellites
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-red-400">
                    {formatNumber(stats?.totalDebris || 0)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Debris Objects
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className={`text-2xl font-bold font-display ${
                    mostCongestedSlot?.congestionLevel === 'critical' ? 'text-red-400' :
                    mostCongestedSlot?.congestionLevel === 'high' ? 'text-orange-400' :
                    'text-yellow-400'
                  }`}>
                    {mostCongestedSlot?.orbitType || 'N/A'}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Most Congested
                  </div>
                  {mostCongestedSlot?.congestionLevel && (
                    <div className={`text-[10px] mt-0.5 ${
                      CONGESTION_STYLES[mostCongestedSlot.congestionLevel]?.text || 'text-slate-400'
                    }`}>
                      {CONGESTION_LEVEL_INFO[mostCongestedSlot.congestionLevel]?.label}
                    </div>
                  )}
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-nebula-300">
                    {operators.length}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Operators
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── Services Stats Banner ──────────────── */}
            {isServicesTab && serviceStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-slate-900">
                    {serviceStats.totalServices}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Total Services
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-slate-900">
                    {serviceStats.uniqueProviders}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Providers
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-green-400">
                    ${(serviceStats.totalContractValue / 1000).toFixed(1)}B
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Known Contract Value
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-slate-900">
                    {serviceStats.totalContracts}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Active Contracts
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── Provider CTA (services tabs) ──────────────── */}
            {isServicesTab && (
              <div className="mb-6">
                <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-nebula-600/10 to-rocket-600/10 border border-nebula-500/20">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{'\u{1F680}'}</span>
                    <p className="text-slate-500">
                      <span className="font-medium text-slate-900">Have services to offer?</span>{' '}
                      Get your orbital services listed in our marketplace.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowListingDialog(true)}
                    className="btn-primary whitespace-nowrap"
                  >
                    List Your Service
                  </button>
                </div>
              </div>
            )}

            {/* ──────────────── Tab Navigation ──────────────── */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {([
                { id: 'overview' as const, label: 'Overview', count: slots.length },
                { id: 'operators' as const, label: 'Operators', count: operators.length },
                { id: 'events' as const, label: 'Events', count: events.length },
                { id: 'services' as const, label: 'Services', count: servicesData.length },
                { id: 'contracts' as const, label: 'Contracts', count: contracts.length },
                { id: 'pricing' as const, label: 'Pricing Guide', count: 0 },
                { id: 'request' as const, label: 'Request Service', count: 0 },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                      : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100/50'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ──────────────── OVERVIEW TAB ──────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Bar */}
                <div className="card p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Orbital Environment Summary</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        {formatNumber(stats?.totalObjects || 0)} total objects tracked across {slots.length} orbital regimes
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-2xl font-bold font-display text-green-400">
                          +{formatNumber(stats?.growth1Year || 0)}
                        </div>
                        <div className="text-slate-400 text-xs">1-Year Growth</div>
                      </div>
                      <div className="w-px h-10 bg-white/[0.06]" />
                      <div className="text-right">
                        <div className="text-2xl font-bold font-display text-blue-400">
                          +{formatNumber(stats?.growth5Year || 0)}
                        </div>
                        <div className="text-slate-400 text-xs">5-Year Growth</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Orbit Type Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {slots.map((slot) => (
                    <OrbitTypeCard key={slot.id} slot={slot} />
                  ))}
                </div>

                {/* Congestion Legend */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Congestion Level Guide</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(['low', 'moderate', 'high', 'critical'] as CongestionLevel[]).map((level) => {
                      const style = CONGESTION_STYLES[level];
                      const info = CONGESTION_LEVEL_INFO[level];
                      return (
                        <div key={level} className={`rounded-lg p-3 ${style.bg} border ${style.border}`}>
                          <span className={`text-sm font-semibold ${style.text}`}>{info.label}</span>
                          <p className="text-slate-400 text-xs mt-1">
                            {level === 'low' && 'Minimal traffic, ample slot availability.'}
                            {level === 'moderate' && 'Growing traffic, coordination recommended.'}
                            {level === 'high' && 'Significant congestion, limited slots remaining.'}
                            {level === 'critical' && 'Maximum congestion, collision avoidance active.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── OPERATORS TAB ──────────────── */}
            {activeTab === 'operators' && (
              <div>
                {/* Orbit Type Filter */}
                <div className="card p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 text-sm mr-2">Filter by orbit:</span>
                    <button
                      onClick={() => handleOrbitFilterChange('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        orbitFilter === ''
                          ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                          : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      All ({operators.length})
                    </button>
                    {(['LEO', 'MEO', 'GEO'] as OrbitType[]).map((orbit) => {
                      const count = operators.filter((op) => {
                        if (orbit === 'LEO') return op.leoCount > 0;
                        if (orbit === 'MEO') return op.meoCount > 0;
                        if (orbit === 'GEO') return op.geoCount > 0;
                        return false;
                      }).length;
                      const orbitInfo = ORBIT_TYPES.find(o => o.value === orbit);
                      return (
                        <button
                          key={orbit}
                          onClick={() => handleOrbitFilterChange(orbit)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                            orbitFilter === orbit
                              ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                              : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>{orbitInfo?.icon}</span>
                          {orbit} ({count})
                        </button>
                      );
                    })}
                    <div className="ml-auto">
                      <ExportButton
                        data={filteredOperators}
                        filename="satellite-operators"
                        columns={OPERATOR_EXPORT_COLUMNS}
                        label="Export"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Fleet Summary */}
                <div className="card p-5 mb-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {orbitFilter ? `${orbitFilter} Operators` : 'All Operators'}
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">
                        {filteredOperators.length} operator{filteredOperators.length !== 1 ? 's' : ''} with a combined fleet of{' '}
                        {formatNumber(filteredOperators.reduce((sum, op) => sum + op.totalActive, 0))} active satellites
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-display text-nebula-300">
                        +{formatNumber(filteredOperators.reduce((sum, op) => sum + op.planned1Year, 0))}
                      </div>
                      <div className="text-slate-400 text-xs">Planned (1Y)</div>
                    </div>
                  </div>
                </div>

                {/* Operator Cards */}
                {filteredOperators.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Operators Found</h3>
                    <p className="text-slate-400">
                      No operators with active satellites in {orbitFilter} orbit.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredOperators.map((operator, idx) => (
                      <OperatorCard key={operator.id} operator={operator} rank={idx + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────────────── EVENTS TAB ──────────────── */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                {/* Event Type Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {(['launch', 'reentry', 'conjunction', 'debris_event', 'maneuver'] as OrbitalEventType[]).map((type) => {
                    const style = EVENT_TYPE_STYLES[type];
                    const count = events.filter(e => e.eventType === type).length;
                    return (
                      <div key={type} className={`card p-4 text-center ${style.bg} border border-slate-200`}>
                        <span className="text-2xl block mb-1">{style.icon}</span>
                        <div className={`text-xl font-bold font-display ${style.color}`}>{count}</div>
                        <div className="text-slate-400 text-xs uppercase tracking-widest">{style.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline */}
                <div className="card p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">Upcoming Orbital Events</h3>
                      <p className="text-slate-400 text-sm">Next 30 days of scheduled and predicted events</p>
                    </div>
                    <ExportButton
                      data={events}
                      filename="orbital-events"
                      columns={EVENT_EXPORT_COLUMNS}
                      label="Export"
                    />
                  </div>
                </div>

                {/* Event Cards */}
                {events.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Upcoming Events</h3>
                    <p className="text-slate-400">No orbital events scheduled in the next 30 days.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}

                {/* Data Note */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Event Tracking Sources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">Launch Schedules</h4>
                      <ul className="space-y-1">
                        <li>SpaceX manifest & FCC filings</li>
                        <li>Arianespace launch calendar</li>
                        <li>ISRO / CNSA official announcements</li>
                        <li>FAA & FCC orbital authorization filings</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">Conjunction & Re-entry</h4>
                      <ul className="space-y-1">
                        <li>USSPACECOM conjunction data messages</li>
                        <li>ESA Space Debris Office predictions</li>
                        <li>The Aerospace Corporation re-entry tracking</li>
                        <li>CelesTrak SOCRATES close-approach data</li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs mt-4">
                    Event dates and confidence levels are based on publicly available scheduling data.
                    Tentative and estimated dates may shift as launch windows are confirmed.
                  </p>
                </div>
              </div>
            )}

            {/* ──────────────── SERVICES TAB ──────────────── */}
            {activeTab === 'services' && (
              <div>
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : servicesError ? (
                  <div className="card p-4 border border-red-500/30 bg-red-900/10 text-red-400">
                    {servicesError}
                  </div>
                ) : (
                  <>
                    {/* Filters */}
                    <div className="card p-4 mb-6">
                      <div className="flex flex-wrap items-center gap-4">
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="input w-auto"
                        >
                          <option value="">All Categories</option>
                          {ORBITAL_SERVICE_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.icon} {cat.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={pricingModelFilter}
                          onChange={(e) => setPricingModelFilter(e.target.value)}
                          className="input w-auto"
                        >
                          <option value="">All Pricing Models</option>
                          {ORBITAL_PRICING_MODELS.map((model) => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Services Grouped by Type */}
                    <div className="space-y-8">
                      {groupServicesByType(servicesData).map(([serviceType, typeServices]) => {
                        const typeInfo = getServiceTypeInfo(serviceType);
                        const catInfo = getCategoryInfo(typeInfo.category);

                        return (
                          <div key={serviceType}>
                            {/* Service Type Header */}
                            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-200">
                              <span className="text-2xl">{typeInfo.icon}</span>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">{typeInfo.label}</h3>
                                <span className="text-xs text-slate-400">{catInfo.label}</span>
                              </div>
                              <span className="ml-auto bg-slate-100/50 text-slate-500 text-xs px-2 py-1 rounded-full">
                                {typeServices.length} service{typeServices.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Services Grid for this Type */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {typeServices.map((service) => {
                                const availInfo = getAvailabilityInfo(service.availability);

                                return (
                                  <div
                                    key={service.id}
                                    className="card overflow-hidden hover:border-slate-300 transition-colors"
                                  >
                                    {/* Header */}
                                    <div className="p-4 border-b border-slate-200">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h4 className="text-lg font-semibold text-slate-900">
                                            {service.serviceName}
                                          </h4>
                                          <p className="text-slate-400 text-sm">{service.providerName}</p>
                                        </div>
                                        <span className={`${availInfo.color} text-white text-xs px-2 py-1 rounded-full`}>
                                          {availInfo.label}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Body */}
                                    <div className="p-4">
                                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                                        {service.description}
                                      </p>

                                      {/* Specs */}
                                      {(service.orbitType || service.coverage) && (
                                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                                          {service.orbitType && (
                                            <span>Orbit: {service.orbitType}</span>
                                          )}
                                          {service.coverage && (
                                            <span>Coverage: {service.coverage}</span>
                                          )}
                                        </div>
                                      )}

                                      {/* Pricing */}
                                      <div className="bg-slate-100/50 rounded-lg p-3">
                                        <div className="text-xl font-bold text-green-400">
                                          {formatPrice(service)}
                                        </div>
                                        {service.pricingNotes && (
                                          <p className="text-slate-400 text-xs mt-1">
                                            {service.pricingNotes}
                                          </p>
                                        )}
                                      </div>

                                      {/* Provider link */}
                                      {service.providerWebsite && (
                                        <a
                                          href={service.providerWebsite}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mt-3 text-nebula-300 hover:text-nebula-200 text-sm inline-flex items-center gap-1"
                                        >
                                          Visit Provider
                                          <span>&rarr;</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {servicesData.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        No services found matching your filters.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ──────────────── CONTRACTS TAB ──────────────── */}
            {activeTab === 'contracts' && (
              <div>
                {/* Filter */}
                <div className="card p-4 mb-6">
                  <select
                    value={customerTypeFilter}
                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="">All Customer Types</option>
                    {ORBITAL_CUSTOMER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contracts Table */}
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100/50">
                        <tr>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Contract</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Customer</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Provider</th>
                          <th className="text-right px-4 py-3 text-slate-500 text-sm font-medium">Value</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Category</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {contracts.map((contract) => (
                          <tr key={contract.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="text-slate-900 font-medium">{contract.title}</div>
                              <div className="text-slate-400 text-xs mt-1 line-clamp-1">
                                {contract.description}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-700">{contract.customerName}</span>
                              <div className="text-slate-400 text-xs capitalize">
                                {contract.customerType}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{contract.providerName}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-green-400 font-semibold">
                                {formatContractValue(contract.contractValue)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-500 text-sm capitalize">
                                {contract.serviceCategory.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                contract.status === 'active'
                                  ? 'bg-green-500/20 text-green-400'
                                  : contract.status === 'completed'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {contract.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {contracts.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    Loading contracts...
                  </div>
                )}
              </div>
            )}

            {/* ──────────────── PRICING GUIDE TAB ──────────────── */}
            {activeTab === 'pricing' && (
              <div className="space-y-8">
                <div className="card p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Pricing Benchmarks by Category</h2>
                  <p className="text-slate-400 mb-6">
                    Market rates based on published pricing, industry reports, and known contracts.
                  </p>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Earth Observation */}
                    <div className="bg-slate-100/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>{'\u{1F6F0}\u{FE0F}'}</span> Earth Observation
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Optical (30cm)</span>
                          <span className="text-green-400">$25-29/km{'\u00B2'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Optical (70cm-1m)</span>
                          <span className="text-green-400">$6-12/km{'\u00B2'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">SAR Imagery</span>
                          <span className="text-green-400">$10-25/km{'\u00B2'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Archive Imagery</span>
                          <span className="text-green-400">$3.80-14/km{'\u00B2'}</span>
                        </div>
                      </div>
                    </div>

                    {/* In-Orbit Computing */}
                    <div className="bg-slate-100/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>{'\u{1F5A5}\u{FE0F}'}</span> In-Orbit Computing
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">GPU Compute</span>
                          <span className="text-green-400">$3-6/GPU-hour</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Edge Compute</span>
                          <span className="text-green-400">$0.50-2/hour</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Energy Advantage</span>
                          <span className="text-blue-400">~10x vs ground</span>
                        </div>
                      </div>
                    </div>

                    {/* Hosted Payloads */}
                    <div className="bg-slate-100/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>{'\u{1F4E6}'}</span> Hosted Payloads
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Annual Hosting</span>
                          <span className="text-green-400">$500K-$15M/year</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Per kg Rate</span>
                          <span className="text-green-400">$25K-75K/kg/year</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rideshare to LEO</span>
                          <span className="text-green-400">$5,500/kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Communications */}
                    <div className="bg-slate-100/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>{'\u{1F4E1}'}</span> Communications
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ground Station</span>
                          <span className="text-green-400">$3-15/minute</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Data Relay</span>
                          <span className="text-green-400">$10K-100K/month</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">IoT/M2M</span>
                          <span className="text-green-400">$10-500/device/mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Space Solar */}
                    <div className="bg-slate-100/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>{'\u{2600}\u{FE0F}'}</span> Space Solar Power
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target LCOE</span>
                          <span className="text-green-400">$25-50/MWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Demo Phase</span>
                          <span className="text-yellow-400">2026-2027</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Commercial</span>
                          <span className="text-blue-400">2028+</span>
                        </div>
                      </div>
                    </div>

                    {/* Sensor Services */}
                    <div className="bg-slate-100/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>{'\u{1F4CA}'}</span> Sensor-as-a-Service
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Weather Data</span>
                          <span className="text-green-400">$5K-50K/month</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">RF Monitoring</span>
                          <span className="text-green-400">$10K-100K/month</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">AIS Tracking</span>
                          <span className="text-green-400">$1K-25K/month</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Factors */}
                <div className="card p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Cost Factors</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">{'\u{1F680}'}</div>
                      <div className="text-xl font-bold text-slate-900">$5,500/kg</div>
                      <div className="text-slate-400 text-sm">Rideshare to LEO</div>
                    </div>
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">{'\u{26FD}'}</div>
                      <div className="text-xl font-bold text-slate-900">$1M-$10M</div>
                      <div className="text-slate-400 text-sm">Annual Ops (per satellite)</div>
                    </div>
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">{'\u{1F4C9}'}</div>
                      <div className="text-xl font-bold text-slate-900">30-60%</div>
                      <div className="text-slate-400 text-sm">Typical Gross Margin</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── REQUEST SERVICE TAB ──────────────── */}
            {activeTab === 'request' && (
              <div className="max-w-2xl mx-auto">
                <div className="card p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Request Orbital Services</h2>
                  <p className="text-slate-400 mb-6">
                    Tell us about your requirements and we&apos;ll help match you with the right providers.
                  </p>

                  {submitted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Request Submitted!</h3>
                      <p className="text-slate-400 mb-6">
                        We&apos;ll review your requirements and get back to you soon.
                      </p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="btn-secondary"
                      >
                        Submit Another Request
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRequestSubmit} className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-slate-500 text-sm font-medium mb-2">
                            Your Email
                          </label>
                          <input
                            type="email"
                            value={requestForm.email}
                            onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                            className="input"
                            placeholder="you@company.com"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-sm font-medium mb-2">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={requestForm.companyName}
                            onChange={(e) => setRequestForm({ ...requestForm, companyName: e.target.value })}
                            className="input"
                            placeholder="Your company"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 text-sm font-medium mb-2">
                          Service Category <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={requestForm.category}
                          onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}
                          required
                          className="input"
                        >
                          <option value="">Select a category...</option>
                          {ORBITAL_SERVICE_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.icon} {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 text-sm font-medium mb-2">
                          Description of Requirements <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={requestForm.description}
                          onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                          required
                          rows={4}
                          className="input resize-none"
                          placeholder="Describe your requirements, use case, and any specific needs..."
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-slate-500 text-sm font-medium mb-2">
                            Budget Range
                          </label>
                          <input
                            type="text"
                            value={requestForm.budget}
                            onChange={(e) => setRequestForm({ ...requestForm, budget: e.target.value })}
                            className="input"
                            placeholder="e.g., $10K-50K/month"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-sm font-medium mb-2">
                            Timeline
                          </label>
                          <input
                            type="text"
                            value={requestForm.timeline}
                            onChange={(e) => setRequestForm({ ...requestForm, timeline: e.target.value })}
                            className="input"
                            placeholder="e.g., Q2 2026"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !requestForm.category || !requestForm.description}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Service Listing Dialog */}
      <ServiceListingDialog
        isOpen={showListingDialog}
        onClose={() => setShowListingDialog(false)}
      />
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (Suspense boundary)
// ────────────────────────────────────────

export default function OrbitalManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <OrbitalManagementContent />
    </Suspense>
  );
}
