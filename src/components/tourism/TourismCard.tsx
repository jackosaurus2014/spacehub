'use client';

import { SpaceTourismOffering, TOURISM_STATUS_LABELS, EXPERIENCE_TYPES } from '@/lib/space-tourism-data';

interface TourismCardProps {
  offering: SpaceTourismOffering;
  isSelected: boolean;
  onToggleCompare: (id: string) => void;
  onLearnMore: (offering: SpaceTourismOffering) => void;
}

export default function TourismCard({
  offering,
  isSelected,
  onToggleCompare,
  onLearnMore,
}: TourismCardProps) {
  const statusInfo = TOURISM_STATUS_LABELS[offering.status];
  const experienceInfo = EXPERIENCE_TYPES.find((e) => e.value === offering.experienceType);

  return (
    <div
      className={`relative backdrop-blur-xl rounded-xl border transition-all duration-300 overflow-hidden ${
        isSelected
          ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/20'
          : 'border-slate-700/50 hover:border-slate-600/50'
      }`}
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)'
      }}
    >
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      {/* Compare checkbox */}
      <div className="absolute top-4 right-4 z-10">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleCompare(offering.id)}
            className="sr-only"
          />
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-cyan-500 border-cyan-500'
              : 'border-slate-500 group-hover:border-cyan-400'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-xs text-slate-400 group-hover:text-slate-300">Compare</span>
        </label>
      </div>

      <div className="p-6">
        {/* Provider Logo/Icon & Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg font-bold text-cyan-400 border border-slate-600/50">
              {offering.logoIcon}
            </div>
            <div>
              <p className="text-cyan-400 text-sm font-medium">{offering.provider}</p>
              <h3 className="text-white font-display font-bold text-lg">{offering.name}</h3>
            </div>
          </div>
        </div>

        {/* Experience Type & Status Badge */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-medium">
            <span>{experienceInfo?.icon}</span>
            {experienceInfo?.label || offering.experienceType}
          </span>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Price Display */}
        <div className="mb-4">
          <div className="text-3xl font-display font-bold text-white">
            {offering.priceDisplay}
          </div>
          <p className="text-slate-400 text-xs mt-1">per seat</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Duration</p>
            <p className="text-white font-semibold text-sm">{offering.duration}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Altitude</p>
            <p className="text-white font-semibold text-sm">{offering.altitudeDisplay}</p>
          </div>
        </div>

        {/* Quick features preview */}
        <div className="mb-5">
          <p className="text-slate-300 text-sm line-clamp-2">
            {offering.description.substring(0, 120)}...
          </p>
        </div>

        {/* Additional Info */}
        <div className="flex flex-wrap gap-2 mb-5 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {offering.maxPassengers} passengers
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {offering.trainingDuration} training
          </span>
        </div>

        {/* Learn More Button */}
        <button
          onClick={() => onLearnMore(offering)}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
        >
          Learn More
        </button>
      </div>
    </div>
  );
}
