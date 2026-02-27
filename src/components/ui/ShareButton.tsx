'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';

interface ShareButtonProps {
  title: string;
  url?: string;
  description?: string;
  className?: string;
}

export default function ShareButton({ title, url, description, className = '' }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function getShareUrl(): string {
    if (url) return url;
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  }

  async function handleCopyLink() {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Link copied to clipboard!');
    }
    setIsOpen(false);
  }

  function handleShareTwitter() {
    const shareUrl = getShareUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    setIsOpen(false);
  }

  function handleShareLinkedIn() {
    const shareUrl = getShareUrl();
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    setIsOpen(false);
  }

  function handleShareEmail() {
    const shareUrl = getShareUrl();
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`Check this out on SpaceNexus:\n\n${title}${description ? '\n' + description : ''}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Share Button */}
      <button
        onClick={async () => {
          // On mobile, try native Web Share API first
          if (typeof navigator !== 'undefined' && navigator.share) {
            try {
              await navigator.share({
                title,
                text: description || title,
                url: getShareUrl(),
              });
              return;
            } catch {
              // User cancelled or API failed; fall through to dropdown
            }
          }
          setIsOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all"
        aria-label="Share"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            Copy Link
          </button>

          <div className="mx-3 my-1 border-t border-slate-700/50" />

          {/* Share on X/Twitter */}
          <button
            onClick={handleShareTwitter}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </button>

          {/* Share on LinkedIn */}
          <button
            onClick={handleShareLinkedIn}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Share on LinkedIn
          </button>

          {/* Share via Email */}
          <button
            onClick={handleShareEmail}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Share via Email
          </button>
        </div>
      )}
    </div>
  );
}
