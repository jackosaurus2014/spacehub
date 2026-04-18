'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import VerifiedBadge from '@/components/VerifiedBadge';

export interface MentorCardData {
  id: string;
  userId: string;
  headline: string;
  bio: string;
  expertiseAreas: string[];
  yearsExperience: number | null;
  hourlyRate: number | null;
  currency: string | null;
  availability: string | null;
  remoteOnly: boolean;
  acceptingMentees: boolean;
  pastCompanies: string[];
  linkedinUrl: string | null;
  endorsementCount: number;
  rating: number | null;
  ratingCount: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    verifiedBadge?: string | null;
  } | null;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatRate(rate: number | null, currency: string | null): string {
  if (rate === null || rate === undefined) return 'Rate on request';
  const symbol = (currency || 'USD') === 'USD' ? '$' : `${currency} `;
  return `${symbol}${rate.toFixed(0)}/hr`;
}

interface MentorCardProps {
  mentor: MentorCardData;
  index?: number;
}

export default function MentorCard({ mentor, index = 0 }: MentorCardProps) {
  const featured = mentor.endorsementCount >= 3 && mentor.acceptingMentees;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
    >
      <Link
        href={`/mentors/${mentor.userId}`}
        className="block focus:outline-none focus:ring-2 focus:ring-white/30 rounded-xl"
      >
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="card p-5 h-full group relative overflow-hidden"
        >
          {featured && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] uppercase tracking-wide font-semibold">
              Featured
            </div>
          )}

          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/5 to-purple-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-white/90 flex-shrink-0">
              {getInitials(mentor.user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white truncate flex items-center gap-1.5">
                <span className="truncate">
                  {mentor.user?.name || 'Anonymous Mentor'}
                </span>
                <VerifiedBadge badge={mentor.user?.verifiedBadge} size="md" />
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                {mentor.headline}
              </p>
            </div>
          </div>

          {/* Bio snippet */}
          <p className="text-xs text-slate-400 line-clamp-2 mb-3 min-h-[2rem]">
            {mentor.bio}
          </p>

          {/* Expertise tags */}
          {mentor.expertiseAreas.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {mentor.expertiseAreas.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-1.5 py-0.5 bg-white/5 text-white/70 border border-white/10 rounded"
                >
                  {tag}
                </span>
              ))}
              {mentor.expertiseAreas.length > 4 && (
                <span className="text-[11px] px-1.5 py-0.5 bg-white/[0.05] text-slate-500 rounded">
                  +{mentor.expertiseAreas.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Footer stats */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-[11px]">
            <div className="flex items-center gap-3 text-slate-400">
              <span title="Endorsements" className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {mentor.endorsementCount} endorsed
              </span>
              {mentor.remoteOnly && (
                <span className="text-emerald-400">Remote</span>
              )}
              {mentor.yearsExperience !== null && (
                <span>{mentor.yearsExperience}y exp</span>
              )}
            </div>
            <span className="text-white/80 font-medium">
              {formatRate(mentor.hourlyRate, mentor.currency)}
            </span>
          </div>

          {!mentor.acceptingMentees && (
            <div className="mt-2 text-[11px] text-slate-500 italic">
              Not accepting new mentees
            </div>
          )}
        </motion.div>
      </Link>
    </motion.div>
  );
}
