'use client';

import { SpaceTalent, TALENT_EXPERTISE_AREAS, TALENT_AVAILABILITY_INFO } from '@/types';

interface TalentCardProps {
  talent: SpaceTalent;
  compact?: boolean;
}

function formatRate(rate: number | null): string {
  if (!rate) return 'Contact for rates';
  return `~$${rate}/hr`;
}

export default function TalentCard({ talent, compact = false }: TalentCardProps) {
  const availabilityInfo = TALENT_AVAILABILITY_INFO[talent.availability];

  const getExpertiseLabel = (exp: string) => {
    const found = TALENT_EXPERTISE_AREAS.find(e => e.value === exp);
    return found ? { label: found.label, icon: found.icon, category: found.category } : { label: exp, icon: '', category: '' };
  };

  const getExpertiseCategory = () => {
    const categories = talent.expertise.map(exp => getExpertiseLabel(exp).category);
    const uniqueCategories = Array.from(new Set(categories));
    if (uniqueCategories.length === 1) return uniqueCategories[0];
    return uniqueCategories.join(' / ');
  };

  if (compact) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-cyan-500/50 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-white text-sm truncate">{talent.name}</h4>
              {talent.featured && (
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                  Featured
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs truncate">{talent.title}</p>
            <p className="text-slate-400 text-xs">{talent.organization}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${availabilityInfo.bgColor}/20 ${availabilityInfo.color}`}>
            {availabilityInfo.label}
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-1">
            {talent.expertise.slice(0, 2).map(exp => {
              const { label, icon } = getExpertiseLabel(exp);
              return (
                <span key={exp} className="text-xs bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
                  {icon} {label}
                </span>
              );
            })}
          </div>
          <span className="text-cyan-400 font-medium text-sm">{formatRate(talent.consultingRate)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5 hover:border-cyan-500/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white text-lg">{talent.name}</h3>
            {talent.featured && (
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                Featured Expert
              </span>
            )}
          </div>
          <p className="text-slate-300 text-sm">{talent.title}</p>
          <p className="text-slate-400 text-sm">{talent.organization}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block text-xs px-2 py-1 rounded ${availabilityInfo.bgColor}/20 ${availabilityInfo.color} mb-1`}>
            {availabilityInfo.label}
          </span>
          <div className="text-cyan-400 font-bold text-lg">{formatRate(talent.consultingRate)}</div>
        </div>
      </div>

      {/* Category Badge */}
      <div className="mb-3">
        <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-1 rounded">
          {getExpertiseCategory()}
        </span>
      </div>

      {/* Expertise Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {talent.expertise.map(exp => {
          const { label, icon } = getExpertiseLabel(exp);
          return (
            <span key={exp} className="text-xs bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded border border-cyan-500/20">
              {icon} {label}
            </span>
          );
        })}
      </div>

      {/* Bio */}
      <p className="text-slate-400 text-sm mb-4 line-clamp-3">{talent.bio}</p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          onClick={() => window.location.href = `mailto:${talent.contactEmail}?subject=Consultation Request`}
        >
          Book Consultation
        </button>
        {talent.linkedIn && (
          <a
            href={talent.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
