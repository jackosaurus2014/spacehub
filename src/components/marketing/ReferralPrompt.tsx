'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';

const STORAGE_KEYS = {
  DISMISS: 'spacenexus-referral-dismiss',
  REF_CODE: 'spacenexus-ref-code',
} as const;

const EXPLORATION_STORAGE_KEY = 'spacenexus-exploration-visits';
const MIN_MODULES_VISITED = 8;
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateRefCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getRefCode(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.REF_CODE);
    if (existing && existing.length === 6) return existing;
    const code = generateRefCode();
    localStorage.setItem(STORAGE_KEYS.REF_CODE, code);
    return code;
  } catch {
    return generateRefCode();
  }
}

function getVisitedModuleCount(): number {
  try {
    const raw = localStorage.getItem(EXPLORATION_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function isDismissedWithinCooldown(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISMISS);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function storeDismiss(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DISMISS, Date.now().toString());
  } catch {
    // localStorage unavailable
  }
}

export default function ReferralPrompt() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralUrl, setReferralUrl] = useState('');

  const shouldShow = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    if (isDismissedWithinCooldown()) return false;
    if (getVisitedModuleCount() < MIN_MODULES_VISITED) return false;
    return true;
  }, []);

  useEffect(() => {
    if (!shouldShow()) return;

    const code = getRefCode();
    setReferralUrl(`https://spacenexus.us/register?ref=${code}`);

    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [shouldShow]);

  const dismiss = useCallback((showThanks?: boolean) => {
    storeDismiss();
    if (showThanks) {
      toast.success('Thanks for sharing!');
    }
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
    }, 300);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => {
        dismiss(true);
      }, 1200);
    } catch {
      toast.error('Could not copy link');
    }
  }, [referralUrl, dismiss]);

  const handleShare = useCallback(async () => {
    if (!referralUrl) return;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Join me on SpaceNexus',
          text: 'The space industry intelligence platform',
          url: referralUrl,
        });
        dismiss(true);
      } catch (err) {
        // User cancelled the share dialog -- not an error
        if (err instanceof Error && err.name !== 'AbortError') {
          toast.error('Share failed');
        }
      }
    } else {
      // Fallback to copy if Web Share API is unavailable
      await handleCopy();
    }
  }, [referralUrl, dismiss, handleCopy]);

  const handleDismiss = useCallback(() => {
    dismiss(false);
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-16 left-3 right-3 z-[54] md:hidden transition-all duration-300 ease-out ${
        animateIn
          ? 'translate-y-0 opacity-100'
          : 'translate-y-8 opacity-0'
      }`}
      role="dialog"
      aria-label="Invite a colleague to SpaceNexus"
    >
      {/* Gradient border wrapper */}
      <div
        className="rounded-2xl p-[1.5px]"
        style={{
          background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
        }}
      >
        <div className="relative bg-slate-900 rounded-2xl px-4 py-3.5">
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            aria-label="Dismiss referral prompt"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="pr-6">
            <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
              <span aria-hidden="true" className="text-base">&#x1F680;</span>
              Invite a colleague
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Share SpaceNexus with your network
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCopy}
              disabled={copied}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600 active:scale-[0.97] transition-all disabled:opacity-60"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy invite link
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white active:scale-[0.97] transition-all"
              style={{
                background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
