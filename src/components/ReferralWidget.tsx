'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const REFERRAL_STORAGE_KEY = 'spacenexus-referrals';
const REFERRAL_GOAL = 3;

export default function ReferralWidget() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'number') {
          setReferralCount(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const userId = session?.user?.email
    ? btoa(session.user.email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
    : 'user';

  const referralLink = `https://spacenexus.us/register?ref=${userId}`;

  const shareText = `I use SpaceNexus for space industry intelligence -- real-time data, market analysis, and 80+ tools for space professionals. Join me: ${referralLink}`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = referralLink;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [referralLink]);

  if (!session || !mounted) {
    return null;
  }

  const progress = Math.min(referralCount / REFERRAL_GOAL, 1);
  const remaining = Math.max(REFERRAL_GOAL - referralCount, 0);

  return (
    <div className="bg-gradient-to-br from-white/[0.06] via-white/[0.04] to-indigo-500/[0.08] border border-white/[0.08] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/20 flex items-center justify-center text-lg">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Invite friends, earn rewards</h3>
          <p className="text-xs text-slate-400">Share SpaceNexus with your network</p>
        </div>
      </div>

      {/* Referral Stats */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">
            You&apos;ve referred <span className="font-bold text-white">{referralCount}</span> {referralCount === 1 ? 'person' : 'people'}
          </span>
          <span className="text-xs text-slate-500">{referralCount}/{REFERRAL_GOAL}</span>
        </div>
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {remaining > 0 ? (
          <p className="text-xs text-indigo-400/80 mt-2">
            Refer {remaining} more {remaining === 1 ? 'friend' : 'friends'} to get 1 month free Professional
          </p>
        ) : (
          <p className="text-xs text-emerald-400 mt-2 font-medium">
            Goal reached! Your free Professional month will be applied.
          </p>
        )}
      </div>

      {/* Referral Link */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1.5">Your referral link</label>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-slate-300 truncate select-all font-mono">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.06] hover:border-white/[0.1]'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex gap-3">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] hover:border-white/[0.1] text-sm text-slate-300 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </a>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] hover:border-white/[0.1] text-sm text-slate-300 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          LinkedIn
        </a>
      </div>

      {/* Reward messaging */}
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        <p className="text-xs text-slate-500 text-center">
          Refer 3 friends &rarr; Get 1 month free Professional
        </p>
      </div>
    </div>
  );
}
