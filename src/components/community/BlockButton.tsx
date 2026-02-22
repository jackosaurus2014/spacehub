'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

interface BlockButtonProps {
  targetUserId: string;
  targetUserName?: string;
  initialBlocked?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function BlockButton({
  targetUserId,
  targetUserName,
  initialBlocked = false,
  size = 'sm',
  className = '',
}: BlockButtonProps) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (!confirming && !blocked) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/community/block', {
        method: blocked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update block status');
      }

      setBlocked(!blocked);
      setConfirming(false);
      toast.success(blocked ? 'User unblocked' : 'User blocked. You will no longer see their content.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update block status');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setConfirming(false);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (confirming) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-slate-400">
          Block {targetUserName || 'this user'}?
        </span>
        <button
          onClick={handleBlock}
          disabled={loading}
          className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Block'}
        </button>
        <button
          onClick={handleCancel}
          className="px-2 py-1 text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleBlock}
      disabled={loading}
      className={`transition-colors p-1 disabled:opacity-50 ${
        blocked
          ? 'text-red-400 hover:text-slate-400'
          : 'text-slate-500 hover:text-red-400'
      } ${className}`}
      title={blocked ? 'Unblock user' : 'Block user'}
      aria-label={blocked ? 'Unblock this user' : 'Block this user'}
    >
      <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    </button>
  );
}
