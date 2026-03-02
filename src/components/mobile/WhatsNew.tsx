'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Announcements data
// ---------------------------------------------------------------------------

interface Announcement {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: string;
}

const ANNOUNCEMENTS: Announcement[] = [
  { id: 'v2.18', date: '2026-03-01', title: 'Daily Streak Tracker', description: 'Track your daily visits and earn milestone badges', icon: '\u{1F525}' },
  { id: 'v2.17', date: '2026-02-28', title: 'Smooth Page Transitions', description: 'CSS View Transitions for seamless navigation', icon: '\u2728' },
  { id: 'v2.16', date: '2026-02-28', title: 'Smart Bookmarks', description: 'Save articles to your reading list with one tap', icon: '\u{1F516}' },
  { id: 'v2.15', date: '2026-02-27', title: 'OLED Dark Mode', description: 'True black theme for OLED screens \u2014 saves battery', icon: '\u{1F311}' },
  { id: 'v2.14', date: '2026-02-27', title: 'iOS Install Guide', description: 'Step-by-step PWA installation for Safari users', icon: '\u{1F4F1}' },
];

const STORAGE_KEY = 'spacenexus-whats-new-seen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLastSeenId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setLastSeenId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable
  }
}

function getUnseenCount(lastSeenId: string | null): number {
  if (!lastSeenId) return ANNOUNCEMENTS.length;
  const idx = ANNOUNCEMENTS.findIndex((a) => a.id === lastSeenId);
  return idx < 0 ? ANNOUNCEMENTS.length : idx;
}

function isUnseen(announcement: Announcement, lastSeenId: string | null): boolean {
  if (!lastSeenId) return true;
  const seenIdx = ANNOUNCEMENTS.findIndex((a) => a.id === lastSeenId);
  if (seenIdx < 0) return true;
  const thisIdx = ANNOUNCEMENTS.findIndex((a) => a.id === announcement.id);
  return thisIdx < seenIdx;
}

function relativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ---------------------------------------------------------------------------
// SparkleIcon (trigger icon)
// ---------------------------------------------------------------------------

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
      <path d="M18 14l1.18 3.54L23 19l-3.82 1.46L18 24l-1.18-3.54L13 19l3.82-1.46L18 14z" opacity={0.6} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// WhatsNewDot
// ---------------------------------------------------------------------------

export function WhatsNewDot({ className }: { className?: string }) {
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    setUnseenCount(getUnseenCount(getLastSeenId()));
  }, []);

  if (unseenCount === 0) return null;

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 ${className ?? ''}`}
      aria-hidden="true"
      style={{
        animation: 'whatsNewPulse 2s ease-in-out infinite',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// WhatsNewModal
// ---------------------------------------------------------------------------

interface WhatsNewModalProps {
  open: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ open, onClose }: WhatsNewModalProps) {
  const [animateIn, setAnimateIn] = useState(false);
  const [lastSeenId, setLastSeenIdState] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Read last seen on mount
  useEffect(() => {
    setLastSeenIdState(getLastSeenId());
  }, []);

  // Animate in/out
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Trigger entrance animation next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      setAnimateIn(false);
    }
  }, [open]);

  // Focus management: trap focus in modal
  useEffect(() => {
    if (open && animateIn && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [open, animateIn]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Restore focus on close
  useEffect(() => {
    if (!open && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleMarkAllRead = useCallback(() => {
    const latestId = ANNOUNCEMENTS[0]?.id;
    if (latestId) {
      setLastSeenId(latestId);
      setLastSeenIdState(latestId);
    }
  }, []);

  const handleClose = useCallback(() => {
    setAnimateIn(false);
    // Wait for exit animation before actually closing
    setTimeout(() => {
      onClose();
    }, 250);
  }, [onClose]);

  if (!open) return null;

  const unseenCount = getUnseenCount(lastSeenId);

  return (
    <>
      {/* Global keyframe styles */}
      <style jsx global>{`
        @keyframes whatsNewPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes whatsNewSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes whatsNewFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999]"
        role="dialog"
        aria-modal="true"
        aria-label="What&apos;s new in SpaceNexus"
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${
            animateIn ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Bottom sheet */}
        <div
          ref={modalRef}
          className={`absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/50 rounded-t-2xl shadow-2xl transition-transform duration-250 ease-out ${
            animateIn ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{
            maxHeight: '70vh',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <SparkleIcon className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-base font-bold text-white">What&apos;s New</h2>
                {unseenCount > 0 && (
                  <p className="text-xs text-slate-400">
                    {unseenCount} new update{unseenCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800/60"
              aria-label="Close what's new panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Announcement list */}
          <div
            className="overflow-y-auto overscroll-contain px-5 py-3"
            style={{ maxHeight: 'calc(70vh - 140px)' }}
          >
            <div className="space-y-1">
              {ANNOUNCEMENTS.map((announcement, idx) => {
                const unseen = isUnseen(announcement, lastSeenId);
                return (
                  <div
                    key={announcement.id}
                    className={`relative flex items-start gap-3.5 py-3 ${
                      idx < ANNOUNCEMENTS.length - 1 ? 'border-b border-slate-800/60' : ''
                    }`}
                  >
                    {/* Unseen indicator bar */}
                    {unseen && (
                      <div
                        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-cyan-400"
                        aria-hidden="true"
                      />
                    )}

                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        unseen
                          ? 'bg-cyan-500/10 border border-cyan-500/20'
                          : 'bg-slate-800/60 border border-slate-700/40'
                      }`}
                      aria-hidden="true"
                    >
                      {announcement.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pl-0.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3
                          className={`text-sm font-semibold truncate ${
                            unseen ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {announcement.title}
                        </h3>
                        {unseen && (
                          <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-1">
                        {announcement.description}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {relativeDate(announcement.date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-700/50">
            {unseenCount > 0 ? (
              <button
                onClick={handleMarkAllRead}
                className="w-full py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors"
              >
                Mark all as read
              </button>
            ) : (
              <p className="text-center text-xs text-slate-500 py-1.5">
                You&apos;re all caught up!
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// WhatsNew (combined trigger + modal)
// ---------------------------------------------------------------------------

export default function WhatsNew() {
  const [isOpen, setIsOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    setUnseenCount(getUnseenCount(getLastSeenId()));
  }, []);

  // Re-check unseen count when modal closes
  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Small delay so the state refreshes after localStorage update
    setTimeout(() => {
      setUnseenCount(getUnseenCount(getLastSeenId()));
    }, 300);
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-slate-400 hover:text-cyan-300 transition-colors rounded-lg hover:bg-slate-800/50"
        aria-label={`What's new${unseenCount > 0 ? ` (${unseenCount} unseen updates)` : ''}`}
      >
        <SparkleIcon className="w-5 h-5" />

        {/* Pulsing dot overlay */}
        {unseenCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400"
            aria-hidden="true"
            style={{
              animation: 'whatsNewPulse 2s ease-in-out infinite',
            }}
          />
        )}
      </button>

      {/* Global keyframe for the dot (in case modal has not mounted yet) */}
      <style jsx global>{`
        @keyframes whatsNewPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>

      {/* Modal */}
      <WhatsNewModal open={isOpen} onClose={handleClose} />
    </>
  );
}
