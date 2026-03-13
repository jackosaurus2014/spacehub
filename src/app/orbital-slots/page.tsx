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
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { clientLogger } from '@/lib/client-logger';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import ServiceListingDialog from '@/components/ui/ServiceListingDialog';
import {
  ORBITAL_REGIMES,
  KEY_GEO_SLOTS,
  MEGA_CONSTELLATIONS,
  REGULATORY_BODIES,
  CONGESTION_STYLES,
  AVAILABILITY_LABELS,
  EVENT_TYPE_STYLES,
  CONFIDENCE_STYLES,
  COUNTRY_FLAGS,
  OPERATOR_EXPORT_COLUMNS,
  EVENT_EXPORT_COLUMNS,
  type OrbitalRegimeInfo,
  type GeoSlotInfo,
  type MegaConstellationInfo,
  type RegulatoryBody,
} from './data';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

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

type TabId = 'overview' | 'geo-slots' | 'constellations' | 'regulatory' | 'operators' | 'events' | 'services' | 'contracts' | 'pricing' | 'request';



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
    color: 'bg-slate-500',
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
    <div className={`card p-5 border ${congestion?.border || 'border-slate-700/50'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{orbitInfo?.icon || '\u{1F6F0}\u{FE0F}'}</span>
          <div>
            <h3 className="text-white font-semibold text-lg">{slot.orbitName}</h3>
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
          <span className="text-white text-sm font-bold">{utilization.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${congestion?.barColor || 'from-white to-slate-400'} rounded-full transition-all`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-white font-bold text-lg">{formatNumber(slot.activeSatellites)}</div>
          <div className="text-slate-400 text-xs">Active</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-yellow-400 font-bold text-lg">{formatNumber(slot.inactiveSatellites)}</div>
          <div className="text-slate-400 text-xs">Inactive</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-red-400 font-bold text-lg">{formatNumber(slot.debrisCount)}</div>
          <div className="text-slate-400 text-xs">Debris</div>
        </div>
      </div>

      {/* Projections */}
      <div className="flex items-center gap-4 pt-3 border-t border-slate-700/50 text-sm">
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
          <div className="text-white font-semibold">{formatNumber(totalObjects)}</div>
        </div>
      </div>

      {/* Cross-module link */}
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <Link
          href="/space-environment?tab=debris"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-slate-200 hover:bg-white/15 transition-colors border border-white/10"
        >
          View debris in this orbit &rarr;
        </Link>

        <RelatedModules modules={PAGE_RELATIONS['orbital-slots']} />
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
          <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-2xl border border-slate-700/50">
            {flag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold">{operator.name}</h3>
              <span className="text-slate-400 text-xs">#{rank}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">{operator.country}</span>
              {operator.constellationName && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-200 text-xs">{operator.constellationName}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {purposeInfo && (
          <span className="text-xs px-2.5 py-1 rounded bg-slate-700/50 text-slate-500 border border-slate-700/50 flex items-center gap-1">
            <span>{purposeInfo.icon}</span>
            {purposeInfo.label}
          </span>
        )}
      </div>

      {/* Fleet Size */}
      <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Active Fleet</span>
          <span className="text-white text-2xl font-bold font-display">{formatNumber(operator.totalActive)}</span>
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
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-white to-slate-400 rounded-full transition-all"
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
      <div className="flex items-center gap-4 pt-3 border-t border-slate-700/50 text-sm">
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
      <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
        <Link
          href="/space-environment?tab=debris"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-slate-200 hover:bg-white/15 transition-colors border border-white/10"
        >
          View Debris &rarr;
        </Link>
        <Link
          href={`/market-intel?search=${encodeURIComponent(operator.name)}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/30"
        >
          Company Intel &rarr;
        </Link>
        {operator.primaryPurpose === 'internet' && (
          <Link
            href="/spectrum"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-rocket-500/20 text-rocket-300 hover:bg-rocket-500/30 transition-colors border border-rocket-500/30"
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
    <div className={`card p-5 border ${isPast ? 'border-slate-700/50 opacity-60' : 'border-slate-700/50'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${eventStyle.bg} flex items-center justify-center text-xl border border-slate-700/50`}>
            {eventStyle.icon}
          </div>
          <div>
            <h4 className="text-white font-semibold">{event.missionName || 'Unknown Mission'}</h4>
            <div className="flex items-center gap-2 text-sm">
              <span className={`${eventStyle.color} text-xs font-medium`}>{eventStyle.label}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-400 text-xs">{event.orbitType}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-white font-medium text-sm">
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
          <div className="bg-slate-700/50 rounded px-3 py-1.5 text-sm">
            <span className="text-slate-400 text-xs block">Operator</span>
            <span className="text-white font-medium">{event.operatorName}</span>
          </div>
        )}
        <div className="bg-slate-700/50 rounded px-3 py-1.5 text-sm">
          <span className="text-slate-400 text-xs block">Satellites</span>
          <span className="text-white font-medium">{event.satelliteCount}</span>
        </div>
        {confidence && (
          <div className="bg-slate-700/50 rounded px-3 py-1.5 text-sm">
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
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <Link
            href="/space-environment?tab=debris"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-slate-200 hover:bg-white/15 transition-colors border border-white/10"
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
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [orbitFilter, setOrbitFilter] = useState<OrbitType | ''>(initialOrbit);

  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [regimeFilter, setRegimeFilter] = useState<string>('');
  const [geoSortBy, setGeoSortBy] = useState<'longitude' | 'value' | 'operator'>('longitude');
  const [constellationStatusFilter, setConstellationStatusFilter] = useState<string>('');

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

  // Determine if the current tab is a static data tab (no API fetch needed)
  const isStaticTab = activeTab === 'geo-slots' || activeTab === 'constellations' || activeTab === 'regulatory';

  // Filtered GEO slots by search
  const filteredGeoSlots = KEY_GEO_SLOTS.filter(slot => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      slot.operator.toLowerCase().includes(q) ||
      slot.position.toLowerCase().includes(q) ||
      slot.satelliteName.toLowerCase().includes(q) ||
      slot.country.toLowerCase().includes(q) ||
      slot.coverageRegion.toLowerCase().includes(q) ||
      slot.use.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (geoSortBy === 'longitude') return a.longitude - b.longitude;
    if (geoSortBy === 'operator') return a.operator.localeCompare(b.operator);
    // sort by value (strip $, M, B, +)
    const parseVal = (v: string) => {
      const num = parseFloat(v.replace(/[^0-9.]/g, ''));
      return v.includes('B') ? num * 1000 : num;
    };
    return parseVal(b.estimatedValue) - parseVal(a.estimatedValue);
  });

  // Filtered constellations by search and status
  const filteredConstellations = MEGA_CONSTELLATIONS.filter(c => {
    if (constellationStatusFilter && c.status !== constellationStatusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.operator.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.purpose.toLowerCase().includes(q)
    );
  });

  // Filtered regulatory bodies by search
  const filteredRegulatory = REGULATORY_BODIES.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.abbreviation.toLowerCase().includes(q) ||
      r.country.toLowerCase().includes(q) ||
      r.scope.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q)
    );
  });

  // Filtered regimes by search
  const filteredRegimes = ORBITAL_REGIMES.filter(r => {
    if (regimeFilter && r.abbreviation !== regimeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.abbreviation.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.keyUses.some(u => u.toLowerCase().includes(q))
    );
  });

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
    setError(null);
    try {
      const res = await fetch('/api/orbital-slots');
      const result = await res.json();

      if (!result.error) {
        setData(result);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch orbital data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
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
      clientLogger.error('Failed to initialize orbital data', { error: error instanceof Error ? error.message : String(error) });
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
      clientLogger.error('Failed to fetch contracts', { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to load data.');
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
        <AnimatedPageHeader
          title="Orbital Management"
          subtitle="Track orbital congestion, satellite operators, fleet compositions, upcoming events, and satellite-based services across all regimes"
          icon="🌍"
          accentColor="cyan"
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {loading && !isServicesTab && !isStaticTab ? (
          <SkeletonPage statCards={4} contentCards={3} />
        ) : needsInit && !isServicesTab && !isStaticTab ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">&#128752;</span>
            <h2 className="text-2xl font-semibold text-white mb-2">
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
              <ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-white">
                    {formatNumber(stats?.totalActive || ORBITAL_REGIMES.reduce((s, r) => s + r.activeSatellites, 0))}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Active Satellites
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-red-400">
                    {formatNumber(stats?.totalDebris || 36500)}
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
                    {mostCongestedSlot?.orbitType || 'LEO'}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Most Congested
                  </div>
                  {mostCongestedSlot?.congestionLevel && (
                    <div className={`text-xs mt-0.5 ${
                      CONGESTION_STYLES[mostCongestedSlot.congestionLevel]?.text || 'text-slate-400'
                    }`}>
                      {CONGESTION_LEVEL_INFO[mostCongestedSlot.congestionLevel]?.label}
                    </div>
                  )}
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-slate-200">
                    {operators.length || MEGA_CONSTELLATIONS.length}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Operators
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-slate-300">
                    {KEY_GEO_SLOTS.length}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Key GEO Slots
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-purple-400">
                    {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + c.approved, 0))}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Approved Sats
                  </div>
                </div>
              </div>
              </ScrollReveal>
            )}

            {/* ──────────────── Services Stats Banner ──────────────── */}
            {isServicesTab && serviceStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-white">
                    {serviceStats.totalServices}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                    Total Services
                  </div>
                </div>
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display text-white">
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
                  <div className="text-2xl font-bold font-display text-white">
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
                <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-200/10 to-rocket-600/10 border border-white/15">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{'\u{1F680}'}</span>
                    <p className="text-slate-500">
                      <span className="font-medium text-white">Have services to offer?</span>{' '}
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

            {/* ──────────────── Search Bar ──────────────── */}
            <div className="mb-6">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orbital slots, constellations, operators, regulatory bodies..."
                  className="input pl-12 pr-10 w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* ──────────────── Tab Navigation ──────────────── */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {([
                { id: 'overview' as const, label: 'Orbital Regimes', count: ORBITAL_REGIMES.length, icon: '\u{1F30D}' },
                { id: 'geo-slots' as const, label: 'GEO Slots', count: KEY_GEO_SLOTS.length, icon: '\u{1F4E1}' },
                { id: 'constellations' as const, label: 'Mega-Constellations', count: MEGA_CONSTELLATIONS.length, icon: '\u{2B50}' },
                { id: 'regulatory' as const, label: 'Regulatory', count: REGULATORY_BODIES.length, icon: '\u{2696}\u{FE0F}' },
                { id: 'operators' as const, label: 'Operators', count: operators.length, icon: '\u{1F6F0}\u{FE0F}' },
                { id: 'events' as const, label: 'Events', count: events.length, icon: '\u{1F4C5}' },
                { id: 'services' as const, label: 'Services', count: servicesData.length, icon: '\u{1F527}' },
                { id: 'contracts' as const, label: 'Contracts', count: contracts.length, icon: '\u{1F4DD}' },
                { id: 'pricing' as const, label: 'Pricing Guide', count: 0, icon: '\u{1F4B0}' },
                { id: 'request' as const, label: 'Request Service', count: 0, icon: '\u{1F4E9}' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700/50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? 'bg-white/20 text-slate-900' : 'bg-slate-700/50 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ──────────────── OVERVIEW TAB (Orbital Regimes) ──────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Bar */}
                <div className="card p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Orbital Environment Summary</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        {formatNumber(stats?.totalObjects || ORBITAL_REGIMES.reduce((s, r) => s + r.activeSatellites, 0) + 36500)} total objects tracked across {ORBITAL_REGIMES.length} primary orbital regimes
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-2xl font-bold font-display text-green-400">
                          +{formatNumber(stats?.growth1Year || 4200)}
                        </div>
                        <div className="text-slate-400 text-xs">1-Year Growth</div>
                      </div>
                      <div className="w-px h-10 bg-white/[0.06]" />
                      <div className="text-right">
                        <div className="text-2xl font-bold font-display text-blue-400">
                          +{formatNumber(stats?.growth5Year || 32000)}
                        </div>
                        <div className="text-slate-400 text-xs">5-Year Growth</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regime Filter */}
                <div className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 text-sm mr-2">Filter by regime:</span>
                    <button
                      onClick={() => setRegimeFilter('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        regimeFilter === ''
                          ? 'bg-slate-700/50 text-white border border-slate-700/50'
                          : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
                      }`}
                    >
                      All ({ORBITAL_REGIMES.length})
                    </button>
                    {ORBITAL_REGIMES.map((regime) => {
                      const congestionStyle = CONGESTION_STYLES[regime.congestion];
                      return (
                        <button
                          key={regime.abbreviation}
                          onClick={() => setRegimeFilter(regime.abbreviation === regimeFilter ? '' : regime.abbreviation)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            regimeFilter === regime.abbreviation
                              ? `${congestionStyle.bg} ${congestionStyle.text} border ${congestionStyle.border}`
                              : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
                          }`}
                        >
                          {regime.abbreviation}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Orbital Regime Detail Cards */}
                <StaggerContainer className="grid grid-cols-1 gap-6">
                  {filteredRegimes.map((regime) => {
                    const congestionStyle = CONGESTION_STYLES[regime.congestion];
                    const totalInRegime = MEGA_CONSTELLATIONS.filter(c =>
                      regime.abbreviation === 'LEO' ? c.orbit === 'LEO' : false
                    ).reduce((s, c) => s + c.operational, 0);

                    return (
                      <StaggerItem key={regime.id}>
                        <div className={`card p-6 border ${congestionStyle.border}`}>
                          {/* Header */}
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-xl ${congestionStyle.bg} border ${congestionStyle.border} flex items-center justify-center`}>
                                <span className="text-2xl font-bold font-display" style={{ lineHeight: 1 }}>
                                  {regime.abbreviation}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-white">{regime.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                  <span>Altitude: {regime.altitudeRange}</span>
                                  <span className="text-slate-600">|</span>
                                  <span>Period: {regime.periodRange}</span>
                                  <span className="text-slate-600">|</span>
                                  <span>Velocity: {regime.velocityRange}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-xs font-bold px-3 py-1.5 rounded ${congestionStyle.bg} ${congestionStyle.text} border ${congestionStyle.border} uppercase tracking-wider`}>
                                {regime.congestion} Congestion
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-slate-400 text-sm leading-relaxed mb-5">{regime.description}</p>

                          {/* Stats Row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold font-display text-white">{formatNumber(regime.activeSatellites)}</div>
                              <div className="text-slate-400 text-xs uppercase tracking-widest">Active Satellites</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold font-display text-slate-300">{regime.altitudeRange.split(' ')[0]}</div>
                              <div className="text-slate-400 text-xs uppercase tracking-widest">Min Alt (km)</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold font-display text-slate-200">{regime.notableConstellations.length}</div>
                              <div className="text-slate-400 text-xs uppercase tracking-widest">Key Systems</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                              <div className={`text-2xl font-bold font-display ${congestionStyle.text}`}>
                                {regime.congestion === 'critical' ? '>95%' : regime.congestion === 'high' ? '~75%' : regime.congestion === 'moderate' ? '~40%' : '<20%'}
                              </div>
                              <div className="text-slate-400 text-xs uppercase tracking-widest">Utilization</div>
                            </div>
                          </div>

                          {/* Utilization Bar */}
                          <div className="mb-5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Orbital Congestion</span>
                              <span className={`text-sm font-bold ${congestionStyle.text}`}>
                                {regime.congestion === 'critical' ? '95%' : regime.congestion === 'high' ? '75%' : regime.congestion === 'moderate' ? '40%' : '15%'}
                              </span>
                            </div>
                            <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${congestionStyle.barColor} rounded-full transition-all duration-1000`}
                                style={{ width: regime.congestion === 'critical' ? '95%' : regime.congestion === 'high' ? '75%' : regime.congestion === 'moderate' ? '40%' : '15%' }}
                              />
                            </div>
                          </div>

                          {/* Two-Column Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Key Uses */}
                            <div>
                              <h4 className="text-white font-medium text-sm mb-2 uppercase tracking-widest">Key Uses</h4>
                              <div className="flex flex-wrap gap-2">
                                {regime.keyUses.map((use) => (
                                  <span key={use} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-200 border border-white/15">
                                    {use}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Challenges */}
                            <div>
                              <h4 className="text-white font-medium text-sm mb-2 uppercase tracking-widest">Challenges</h4>
                              <ul className="space-y-1">
                                {regime.challenges.map((challenge) => (
                                  <li key={challenge} className="text-slate-400 text-xs flex items-start gap-2">
                                    <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                                    {challenge}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Notable Constellations */}
                          <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <h4 className="text-white font-medium text-sm mb-2 uppercase tracking-widest">Notable Systems</h4>
                            <div className="flex flex-wrap gap-2">
                              {regime.notableConstellations.map((name) => (
                                <span key={name} className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-200 border border-slate-700/50">
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Cross-module link */}
                          <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-2">
                            <Link
                              href="/space-environment?tab=debris"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-slate-200 hover:bg-white/15 transition-colors border border-white/10"
                            >
                              View debris in this orbit &rarr;
                            </Link>
                            <Link
                              href="/spectrum"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-rocket-500/20 text-rocket-300 hover:bg-rocket-500/30 transition-colors border border-rocket-500/30"
                            >
                              Spectrum Filings &rarr;
                            </Link>
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>

                {filteredRegimes.length === 0 && (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-white mb-2">No Matching Regimes</h3>
                    <p className="text-slate-400">Try adjusting your search or filter.</p>
                  </div>
                )}

                {/* DB-loaded Orbit Type Cards */}
                {slots.length > 0 && !regimeFilter && !searchQuery && (
                  <>
                    <div className="card p-5 mt-2">
                      <h3 className="text-lg font-semibold text-white mb-1">Detailed Orbital Slot Data</h3>
                      <p className="text-slate-400 text-sm">Granular slot-level data from our tracking database</p>
                    </div>
                    <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {slots.map((slot) => (
                        <StaggerItem key={slot.id}>
                          <OrbitTypeCard slot={slot} />
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  </>
                )}

                {/* Congestion Legend */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-white mb-3">Congestion Level Guide</h3>
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

            {/* ──────────────── GEO SLOTS TAB ──────────────── */}
            {activeTab === 'geo-slots' && (
              <div className="space-y-6">
                {/* GEO Introduction */}
                <div className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">{'\u{1F4E1}'}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Geostationary Orbital Slots</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        GEO slots at 35,786 km altitude are among the most commercially valuable positions in space. With approximately 1,800 usable positions
                        (at 0.2{'\u00B0'} spacing), these slots are coordinated by the ITU and assigned to national administrations. A single
                        premium GEO slot can be worth hundreds of millions of dollars in broadcast and communications revenue.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sort Controls */}
                <div className="card p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-slate-400 text-sm">Sort by:</span>
                    {([
                      { value: 'longitude' as const, label: 'Longitude' },
                      { value: 'operator' as const, label: 'Operator' },
                      { value: 'value' as const, label: 'Estimated Value' },
                    ]).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setGeoSortBy(option.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          geoSortBy === option.value
                            ? 'bg-white/10 text-slate-200 border border-white/10'
                            : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <span className="ml-auto text-slate-500 text-sm">
                      {filteredGeoSlots.length} slot{filteredGeoSlots.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* GEO Slot Cards */}
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredGeoSlots.map((slot) => {
                    const flag = COUNTRY_FLAGS[slot.country] || '\u{1F30D}';
                    return (
                      <StaggerItem key={slot.position}>
                        <div className="card p-5 hover:border-white/10 transition-colors h-full flex flex-col">
                          {/* Position Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/5 to-blue-500/20 border border-white/10 flex items-center justify-center">
                                <span className="text-slate-200 font-bold text-sm font-display">{slot.position}</span>
                              </div>
                              <div>
                                <h4 className="text-white font-semibold">{slot.operator}</h4>
                                <div className="flex items-center gap-2 text-sm">
                                  <span>{flag}</span>
                                  <span className="text-slate-400">{slot.country}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              slot.status === 'active'
                                ? 'bg-green-500/20 text-green-400'
                                : slot.status === 'planned'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                            </span>
                          </div>

                          {/* Satellite Info */}
                          <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                            <div className="text-slate-400 text-xs mb-1">Satellite(s)</div>
                            <div className="text-white text-sm font-medium">{slot.satelliteName}</div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <div className="text-slate-400 text-xs">Use</div>
                              <div className="text-white text-sm mt-0.5">{slot.use}</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <div className="text-slate-400 text-xs">Band</div>
                              <div className="text-white text-sm mt-0.5">{slot.band}</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <div className="text-slate-400 text-xs">Coverage</div>
                              <div className="text-white text-sm mt-0.5">{slot.coverageRegion}</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <div className="text-slate-400 text-xs">Est. Value</div>
                              <div className="text-green-400 text-sm font-semibold mt-0.5">{slot.estimatedValue}</div>
                            </div>
                          </div>

                          {/* Notes */}
                          <p className="text-slate-400 text-xs leading-relaxed mb-3">{slot.notes}</p>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 mt-auto">
                            {slot.launchYear && (
                              <span className="text-slate-500 text-xs">Launch: {slot.launchYear}</span>
                            )}
                            <Link
                              href="/spectrum"
                              className="inline-flex items-center gap-1 text-xs text-slate-200 hover:text-white transition-colors"
                            >
                              Spectrum Filings &rarr;
                            </Link>
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>

                {filteredGeoSlots.length === 0 && (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-white mb-2">No Matching GEO Slots</h3>
                    <p className="text-slate-400">Try adjusting your search.</p>
                  </div>
                )}

                {/* GEO Slot Explainer */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-white mb-3">How GEO Slot Allocation Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 font-bold text-sm">1</span>
                        <h4 className="text-white font-medium">Filing</h4>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        National administration files an Advance Publication Information (API) with the ITU Radio Bureau,
                        providing technical parameters of the planned satellite network.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 font-bold text-sm">2</span>
                        <h4 className="text-white font-medium">Coordination</h4>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        The filing enters a coordination phase where potentially affected administrations are identified.
                        Bilateral negotiations resolve interference issues (can take 2-7 years).
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 font-bold text-sm">3</span>
                        <h4 className="text-white font-medium">Recording</h4>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Once coordination is complete and the satellite is deployed, the assignment is recorded in the Master
                        International Frequency Register (MIFR), granting international recognition.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── CONSTELLATIONS TAB ──────────────── */}
            {activeTab === 'constellations' && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="card-elevated p-4 text-center">
                    <div className="text-2xl font-bold font-display text-white">
                      {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + c.launched, 0))}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Launched</div>
                  </div>
                  <div className="card-elevated p-4 text-center">
                    <div className="text-2xl font-bold font-display text-green-400">
                      {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + c.operational, 0))}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Operational</div>
                  </div>
                  <div className="card-elevated p-4 text-center">
                    <div className="text-2xl font-bold font-display text-slate-300">
                      {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + c.approved, 0))}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Approved</div>
                  </div>
                  <div className="card-elevated p-4 text-center">
                    <div className="text-2xl font-bold font-display text-purple-400">
                      {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + (c.gen2Target || 0), 0))}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Gen2 Target</div>
                  </div>
                  <div className="card-elevated p-4 text-center">
                    <div className="text-2xl font-bold font-display text-yellow-400">
                      {MEGA_CONSTELLATIONS.length}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Constellations</div>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 text-sm mr-2">Filter by status:</span>
                    <button
                      onClick={() => setConstellationStatusFilter('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        constellationStatusFilter === ''
                          ? 'bg-slate-700/50 text-white border border-slate-700/50'
                          : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
                      }`}
                    >
                      All ({MEGA_CONSTELLATIONS.length})
                    </button>
                    {(['operational', 'deploying', 'planned', 'early-stage'] as const).map((status) => {
                      const count = MEGA_CONSTELLATIONS.filter(c => c.status === status).length;
                      const colors: Record<string, string> = {
                        operational: 'text-green-400',
                        deploying: 'text-blue-400',
                        planned: 'text-yellow-400',
                        'early-stage': 'text-slate-400',
                      };
                      return (
                        <button
                          key={status}
                          onClick={() => setConstellationStatusFilter(status === constellationStatusFilter ? '' : status)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            constellationStatusFilter === status
                              ? 'bg-slate-700/50 text-white border border-slate-700/50'
                              : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
                          }`}
                        >
                          <span className={colors[status]}>{status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}</span> ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Constellation Cards */}
                <StaggerContainer className="space-y-6">
                  {filteredConstellations.map((constellation) => {
                    const flag = COUNTRY_FLAGS[constellation.country] || '\u{1F30D}';
                    const launchProgress = constellation.approved > 0 ? (constellation.launched / constellation.approved) * 100 : 0;
                    const operationalRate = constellation.launched > 0 ? (constellation.operational / constellation.launched) * 100 : 0;
                    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                      operational: { bg: 'bg-green-900/20', text: 'text-green-400', border: 'border-green-500/30' },
                      deploying: { bg: 'bg-blue-900/20', text: 'text-blue-400', border: 'border-blue-500/30' },
                      planned: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
                      'early-stage': { bg: 'bg-slate-700/30', text: 'text-slate-400', border: 'border-slate-600/30' },
                    };
                    const sc = statusColors[constellation.status];

                    return (
                      <StaggerItem key={constellation.name}>
                        <div className={`card p-6 border ${sc.border}`}>
                          {/* Header */}
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-xl ${sc.bg} border ${sc.border} flex items-center justify-center`}>
                                <span className="text-3xl">{'\u{2B50}'}</span>
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-white">{constellation.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                                  <span>{flag} {constellation.country}</span>
                                  <span className="text-slate-600">|</span>
                                  <span>{constellation.operator}</span>
                                  <span className="text-slate-600">|</span>
                                  <span>{constellation.orbit} @ {constellation.altitude}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded ${sc.bg} ${sc.text} border ${sc.border} uppercase tracking-wider`}>
                              {constellation.status.replace('-', ' ')}
                            </span>
                          </div>

                          {/* Purpose */}
                          <p className="text-slate-400 text-sm mb-5">{constellation.purpose}</p>

                          {/* Launch Progress Bar */}
                          <div className="mb-5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Launch Progress</span>
                              <span className="text-white text-sm font-bold">{launchProgress.toFixed(1)}% ({formatNumber(constellation.launched)} / {formatNumber(constellation.approved)})</span>
                            </div>
                            <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden relative">
                              <div
                                className="h-full bg-gradient-to-r from-white to-blue-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(launchProgress, 100)}%` }}
                              />
                              {constellation.gen2Target && constellation.gen2Target > constellation.approved && (
                                <div
                                  className="absolute top-0 h-full border-r-2 border-dashed border-purple-400/50"
                                  style={{ left: `${Math.min((constellation.approved / constellation.gen2Target) * 100, 100)}%` }}
                                  title={`Gen1 approved: ${formatNumber(constellation.approved)}`}
                                />
                              )}
                            </div>
                            {constellation.gen2Target && (
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-purple-400/60 text-xs">Gen2 Target: {formatNumber(constellation.gen2Target)}</span>
                                <span className="text-slate-500 text-xs">{((constellation.launched / constellation.gen2Target) * 100).toFixed(1)}% of Gen2</span>
                              </div>
                            )}
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-white">{formatNumber(constellation.launched)}</div>
                              <div className="text-slate-400 text-xs">Launched</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-green-400">{formatNumber(constellation.operational)}</div>
                              <div className="text-slate-400 text-xs">Operational</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-slate-300">{formatNumber(constellation.approved)}</div>
                              <div className="text-slate-400 text-xs">Approved</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-purple-400">{formatNumber(constellation.gen2Target || 0)}</div>
                              <div className="text-slate-400 text-xs">Gen2 Target</div>
                            </div>
                          </div>

                          {/* Technical Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">First Launch</span>
                                <span className="text-white">{constellation.firstLaunch}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Inclination/Planes</span>
                                <span className="text-white text-xs text-right max-w-[200px]">{constellation.inclinationPlanes}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Mass/Satellite</span>
                                <span className="text-white">{constellation.massPerSat}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Design Life</span>
                                <span className="text-white">{constellation.designLife}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Deorbit Plan</span>
                                <span className="text-white text-xs text-right max-w-[200px]">{constellation.deorbitPlan}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Funding</span>
                                <span className="text-white text-xs text-right max-w-[200px]">{constellation.fundingStatus}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Operational Rate</span>
                                <span className={`font-semibold ${operationalRate > 95 ? 'text-green-400' : operationalRate > 80 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                  {constellation.launched > 0 ? `${operationalRate.toFixed(1)}%` : 'N/A'}
                                </span>
                              </div>
                              {constellation.website !== 'N/A' && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-400">Website</span>
                                  <a
                                    href={constellation.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-200 hover:text-white text-xs transition-colors"
                                  >
                                    Visit &rarr;
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Cross-links */}
                          <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-2">
                            <Link
                              href={`/market-intel?search=${encodeURIComponent(constellation.operator)}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/30"
                            >
                              Company Intel &rarr;
                            </Link>
                            <Link
                              href="/space-environment?tab=debris"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-slate-200 hover:bg-white/15 transition-colors border border-white/10"
                            >
                              Debris Impact &rarr;
                            </Link>
                            <Link
                              href="/spectrum"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-rocket-500/20 text-rocket-300 hover:bg-rocket-500/30 transition-colors border border-rocket-500/30"
                            >
                              Spectrum Filings &rarr;
                            </Link>
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>

                {filteredConstellations.length === 0 && (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-white mb-2">No Matching Constellations</h3>
                    <p className="text-slate-400">Try adjusting your search or filter.</p>
                  </div>
                )}

                {/* Data Sources */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-white mb-3">Constellation Data Sources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                    <div>
                      <h4 className="text-white font-medium mb-2">Launch & Operations Data</h4>
                      <ul className="space-y-1 text-xs">
                        <li>FCC NGSO processing round filings</li>
                        <li>ITU satellite network filings (SNL database)</li>
                        <li>Jonathan McDowell&apos;s GCAT satellite catalog</li>
                        <li>UCS Satellite Database</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2">Regulatory & Approval Data</h4>
                      <ul className="space-y-1 text-xs">
                        <li>FCC Space Bureau authorization records</li>
                        <li>ITU BR IFIC publications</li>
                        <li>National regulatory filings (Ofcom, CNES, etc.)</li>
                        <li>Operator press releases and SEC filings</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── REGULATORY TAB ──────────────── */}
            {activeTab === 'regulatory' && (
              <div className="space-y-6">
                {/* Regulatory Overview */}
                <div className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">{'\u{2696}\u{FE0F}'}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Space Regulatory Framework</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        Orbital slot allocation, frequency coordination, and space operations are governed by a layered system of international treaties,
                        multilateral organizations, and national regulatory bodies. The ITU coordinates globally, while national agencies like the FCC,
                        Ofcom, and CNES handle domestic licensing and enforcement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Treaty Framework Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="card p-4 text-center border border-purple-500/20">
                    <div className="text-3xl mb-2">{'\u{1F30D}'}</div>
                    <div className="text-white font-semibold text-sm">Outer Space Treaty</div>
                    <div className="text-slate-400 text-xs mt-1">1967 - Foundation</div>
                    <div className="text-purple-400 text-xs mt-2">115 ratifications</div>
                  </div>
                  <div className="card p-4 text-center border border-purple-500/20">
                    <div className="text-3xl mb-2">{'\u{1F4DD}'}</div>
                    <div className="text-white font-semibold text-sm">Registration Convention</div>
                    <div className="text-slate-400 text-xs mt-1">1975 - Object tracking</div>
                    <div className="text-purple-400 text-xs mt-2">72 ratifications</div>
                  </div>
                  <div className="card p-4 text-center border border-purple-500/20">
                    <div className="text-3xl mb-2">{'\u{2696}\u{FE0F}'}</div>
                    <div className="text-white font-semibold text-sm">Liability Convention</div>
                    <div className="text-slate-400 text-xs mt-1">1972 - Damage claims</div>
                    <div className="text-purple-400 text-xs mt-2">98 ratifications</div>
                  </div>
                  <div className="card p-4 text-center border border-purple-500/20">
                    <div className="text-3xl mb-2">{'\u{1F4E1}'}</div>
                    <div className="text-white font-semibold text-sm">ITU Radio Regulations</div>
                    <div className="text-slate-400 text-xs mt-1">Frequency & orbit</div>
                    <div className="text-purple-400 text-xs mt-2">193 member states</div>
                  </div>
                </div>

                {/* Regulatory Body Cards */}
                <StaggerContainer className="space-y-6">
                  {filteredRegulatory.map((body) => {
                    const flag = COUNTRY_FLAGS[body.country] || '\u{1F30D}';
                    return (
                      <StaggerItem key={body.abbreviation}>
                        <div className="card p-6 border border-purple-500/10 hover:border-purple-500/30 transition-colors">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <span className="text-purple-300 font-bold text-base font-display">{body.abbreviation}</span>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white">{body.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                                  <span>{flag} {body.country}</span>
                                  <span className="text-slate-600">|</span>
                                  <span>{body.scope}</span>
                                </div>
                              </div>
                            </div>
                            <a
                              href={body.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                            >
                              Visit Website &rarr;
                            </a>
                          </div>

                          {/* Role Description */}
                          <p className="text-slate-400 text-sm leading-relaxed mb-5">{body.role}</p>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Key Responsibilities */}
                            <div>
                              <h4 className="text-white font-medium text-sm mb-2 uppercase tracking-widest">Key Responsibilities</h4>
                              <ul className="space-y-1.5">
                                {body.keyResponsibilities.map((resp) => (
                                  <li key={resp} className="text-slate-400 text-xs flex items-start gap-2">
                                    <span className="text-purple-400 mt-0.5 flex-shrink-0">&bull;</span>
                                    {resp}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Filing Types */}
                            <div>
                              <h4 className="text-white font-medium text-sm mb-2 uppercase tracking-widest">Filing Types</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {body.filingTypes.map((type) => (
                                  <span key={type} className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-200 border border-slate-700/50">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Relevant Treaties */}
                            <div>
                              <h4 className="text-white font-medium text-sm mb-2 uppercase tracking-widest">Legal Framework</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {body.relevantTreaties.map((treaty) => (
                                  <span key={treaty} className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                    {treaty}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Cross-module link */}
                          <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-2">
                            <Link
                              href="/compliance"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors border border-purple-500/30"
                            >
                              Compliance Hub &rarr;
                            </Link>
                            <Link
                              href="/spectrum"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-rocket-500/20 text-rocket-300 hover:bg-rocket-500/30 transition-colors border border-rocket-500/30"
                            >
                              Spectrum Management &rarr;
                            </Link>
                            <Link
                              href="/compliance?tab=filings"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-slate-200 hover:bg-white/15 transition-colors border border-white/10"
                            >
                              Regulatory Filings &rarr;
                            </Link>
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>

                {filteredRegulatory.length === 0 && (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-white mb-2">No Matching Regulatory Bodies</h3>
                    <p className="text-slate-400">Try adjusting your search.</p>
                  </div>
                )}

                {/* Regulatory Landscape Notes */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-white mb-3">Evolving Regulatory Landscape</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h4 className="text-white font-medium mb-2">Key Trends</h4>
                      <ul className="space-y-1.5 text-xs text-slate-400">
                        <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5 flex-shrink-0">&rarr;</span>FCC 5-year deorbit rule (effective 2024) replacing 25-year guideline</li>
                        <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5 flex-shrink-0">&rarr;</span>Growing push for binding IADC debris mitigation guidelines</li>
                        <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5 flex-shrink-0">&rarr;</span>NGSO mega-constellation coordination challenges with ITU</li>
                        <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5 flex-shrink-0">&rarr;</span>Space sustainability rating systems under development</li>
                        <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5 flex-shrink-0">&rarr;</span>WRC-23 outcomes affecting NGSO spectrum sharing rules</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2">Upcoming Milestones</h4>
                      <ul className="space-y-1.5 text-xs text-slate-400">
                        <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5 flex-shrink-0">&rarr;</span>WRC-27 preparations for spectrum allocation decisions</li>
                        <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5 flex-shrink-0">&rarr;</span>EU Space Law regulation expected 2025-2026</li>
                        <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5 flex-shrink-0">&rarr;</span>India Space Activities Bill finalization</li>
                        <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5 flex-shrink-0">&rarr;</span>UN COPUOS sustainability guidelines implementation review</li>
                        <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5 flex-shrink-0">&rarr;</span>Active Debris Removal regulatory framework discussions</li>
                      </ul>
                    </div>
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
                          ? 'bg-slate-700/50 text-white border border-slate-700/50'
                          : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
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
                              ? 'bg-slate-700/50 text-white border border-slate-700/50'
                              : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
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
                      <h3 className="text-lg font-semibold text-white">
                        {orbitFilter ? `${orbitFilter} Operators` : 'All Operators'}
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">
                        {filteredOperators.length} operator{filteredOperators.length !== 1 ? 's' : ''} with a combined fleet of{' '}
                        {formatNumber(filteredOperators.reduce((sum, op) => sum + op.totalActive, 0))} active satellites
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-display text-slate-200">
                        +{formatNumber(filteredOperators.reduce((sum, op) => sum + op.planned1Year, 0))}
                      </div>
                      <div className="text-slate-400 text-xs">Planned (1Y)</div>
                    </div>
                  </div>
                </div>

                {/* Operator Cards */}
                {filteredOperators.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-white mb-2">No Operators Found</h3>
                    <p className="text-slate-400">
                      No operators with active satellites in {orbitFilter} orbit.
                    </p>
                  </div>
                ) : (
                  <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredOperators.map((operator, idx) => (
                      <StaggerItem key={operator.id}>
                        <OperatorCard operator={operator} rank={idx + 1} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
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
                      <div key={type} className={`card p-4 text-center ${style.bg} border border-slate-700/50`}>
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
                      <h3 className="text-lg font-semibold text-white mb-1">Upcoming Orbital Events</h3>
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
                    <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Events</h3>
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
                  <h3 className="text-lg font-semibold text-white mb-3">Event Tracking Sources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                    <div>
                      <h4 className="text-white font-medium mb-2">Launch Schedules</h4>
                      <ul className="space-y-1">
                        <li>SpaceX manifest & FCC filings</li>
                        <li>Arianespace launch calendar</li>
                        <li>ISRO / CNSA official announcements</li>
                        <li>FAA & FCC orbital authorization filings</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2">Conjunction & Re-entry</h4>
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
                            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-700/50">
                              <span className="text-2xl">{typeInfo.icon}</span>
                              <div>
                                <h3 className="text-lg font-semibold text-white">{typeInfo.label}</h3>
                                <span className="text-xs text-slate-400">{catInfo.label}</span>
                              </div>
                              <span className="ml-auto bg-slate-700/50 text-slate-500 text-xs px-2 py-1 rounded-full">
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
                                    <div className="p-4 border-b border-slate-700/50">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h4 className="text-lg font-semibold text-white">
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
                                      <div className="bg-slate-700/50 rounded-lg p-3">
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
                                          className="mt-3 text-slate-200 hover:text-white text-sm inline-flex items-center gap-1"
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
                      <thead className="bg-slate-700/50">
                        <tr>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Contract</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Customer</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Provider</th>
                          <th className="text-right px-4 py-3 text-slate-500 text-sm font-medium">Value</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Category</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {contracts.map((contract) => (
                          <tr key={contract.id} className="hover:bg-slate-700/30">
                            <td className="px-4 py-3">
                              <div className="text-white font-medium">{contract.title}</div>
                              <div className="text-slate-400 text-xs mt-1 line-clamp-1">
                                {contract.description}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-200">{contract.customerName}</span>
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
                  <h2 className="text-xl font-semibold text-white mb-4">Pricing Benchmarks by Category</h2>
                  <p className="text-slate-400 mb-6">
                    Market rates based on published pricing, industry reports, and known contracts.
                  </p>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Earth Observation */}
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
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
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
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
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
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
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
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
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
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
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
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
                  <h2 className="text-xl font-semibold text-white mb-4">Cost Factors</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">{'\u{1F680}'}</div>
                      <div className="text-xl font-bold text-white">$5,500/kg</div>
                      <div className="text-slate-400 text-sm">Rideshare to LEO</div>
                    </div>
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">{'\u{26FD}'}</div>
                      <div className="text-xl font-bold text-white">$1M-$10M</div>
                      <div className="text-slate-400 text-sm">Annual Ops (per satellite)</div>
                    </div>
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">{'\u{1F4C9}'}</div>
                      <div className="text-xl font-bold text-white">30-60%</div>
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
                  <h2 className="text-xl font-semibold text-white mb-2">Request Orbital Services</h2>
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
                      <h3 className="text-lg font-semibold text-white mb-2">Request Submitted!</h3>
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
