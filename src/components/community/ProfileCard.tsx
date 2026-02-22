'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ReportButton from './ReportButton';
import BlockButton from './BlockButton';

interface ProfileData {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  location: string | null;
  linkedinUrl: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ProfileCardProps {
  profile: ProfileData;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  index?: number;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ProfileCard({ profile, isFollowing = false, onFollowToggle, index = 0 }: ProfileCardProps) {
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const method = following ? 'DELETE' : 'POST';
      const res = await fetch('/api/community/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: profile.userId }),
      });
      if (res.ok) {
        setFollowing(!following);
        onFollowToggle?.();
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="card p-5 h-full group relative overflow-hidden"
      >
        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30" />
          <div className="absolute inset-[1px] rounded-xl bg-slate-900/95" />
        </div>

        <div className="relative z-10">
          {/* Avatar + Name */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-cyan-300 flex-shrink-0">
              {getInitials(profile.user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                {profile.user.name || 'Anonymous'}
              </h3>
              {profile.headline && (
                <p className="text-xs text-slate-400 line-clamp-1">{profile.headline}</p>
              )}
              {profile.location && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.location}
                </p>
              )}
            </div>
          </div>

          {/* Expertise tags */}
          {profile.expertise && profile.expertise.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {profile.expertise.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded"
                >
                  {tag}
                </span>
              ))}
              {profile.expertise.length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 text-slate-500 rounded">
                  +{profile.expertise.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
            <button
              onClick={handleFollow}
              disabled={loading}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                following
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-cyan-600 text-white hover:bg-cyan-500'
              } disabled:opacity-50`}
            >
              {loading ? '...' : following ? 'Following' : 'Follow'}
            </button>
            <Link
              href={`/messages?to=${profile.userId}`}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-center"
              onClick={(e) => e.stopPropagation()}
            >
              Message
            </Link>
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:text-blue-400 hover:bg-slate-600 transition-colors"
                title="LinkedIn"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
            <div className="ml-auto flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <ReportButton contentType="profile" contentId={profile.id} size="sm" />
              <BlockButton targetUserId={profile.userId} targetUserName={profile.user.name || undefined} size="sm" />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
