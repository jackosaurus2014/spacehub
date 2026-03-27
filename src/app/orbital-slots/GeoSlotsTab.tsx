'use client';

import Link from 'next/link';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import {
  KEY_GEO_SLOTS,
  COUNTRY_FLAGS,
  type GeoSlotInfo,
} from './data';

interface GeoSlotsTabProps {
  filteredGeoSlots: GeoSlotInfo[];
  searchQuery: string;
  geoSortBy: 'longitude' | 'value' | 'operator';
  setGeoSortBy: (v: 'longitude' | 'value' | 'operator') => void;
}

export default function GeoSlotsTab({ filteredGeoSlots, geoSortBy, setGeoSortBy }: GeoSlotsTabProps) {
  return (
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
                  ? 'bg-white/10 text-white/90 border border-white/10'
                  : 'bg-transparent text-slate-400 border border-white/[0.06] hover:border-white/[0.1]'
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
                      <span className="text-white/90 font-bold text-sm font-display">{slot.position}</span>
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
                <div className="bg-white/[0.08] rounded-lg p-3 mb-4">
                  <div className="text-slate-400 text-xs mb-1">Satellite(s)</div>
                  <div className="text-white text-sm font-medium">{slot.satelliteName}</div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
                  <div className="bg-white/[0.08] rounded-lg p-3">
                    <div className="text-slate-400 text-xs">Use</div>
                    <div className="text-white text-sm mt-0.5">{slot.use}</div>
                  </div>
                  <div className="bg-white/[0.08] rounded-lg p-3">
                    <div className="text-slate-400 text-xs">Band</div>
                    <div className="text-white text-sm mt-0.5">{slot.band}</div>
                  </div>
                  <div className="bg-white/[0.08] rounded-lg p-3">
                    <div className="text-slate-400 text-xs">Coverage</div>
                    <div className="text-white text-sm mt-0.5">{slot.coverageRegion}</div>
                  </div>
                  <div className="bg-white/[0.08] rounded-lg p-3">
                    <div className="text-slate-400 text-xs">Est. Value</div>
                    <div className="text-green-400 text-sm font-semibold mt-0.5">{slot.estimatedValue}</div>
                  </div>
                </div>

                {/* Notes */}
                <p className="text-slate-400 text-xs leading-relaxed mb-3">{slot.notes}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] mt-auto">
                  {slot.launchYear && (
                    <span className="text-slate-500 text-xs">Launch: {slot.launchYear}</span>
                  )}
                  <Link
                    href="/spectrum"
                    className="inline-flex items-center gap-1 text-xs text-white/90 hover:text-white transition-colors"
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
              <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/90 font-bold text-sm">1</span>
              <h4 className="text-white font-medium">Filing</h4>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              National administration files an Advance Publication Information (API) with the ITU Radio Bureau,
              providing technical parameters of the planned satellite network.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/90 font-bold text-sm">2</span>
              <h4 className="text-white font-medium">Coordination</h4>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              The filing enters a coordination phase where potentially affected administrations are identified.
              Bilateral negotiations resolve interference issues (can take 2-7 years).
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/90 font-bold text-sm">3</span>
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
  );
}
