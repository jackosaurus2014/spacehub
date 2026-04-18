'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import VerifiedBadge from '@/components/VerifiedBadge';

type RequestableBadge = 'founder' | 'investor' | 'media';

interface VerificationNote {
  requestedBadge?: string;
  justification?: string;
  links?: {
    website?: string;
    linkedinUrl?: string;
    supportingUrl?: string;
  };
  submittedAt?: string;
}

interface PendingRequest {
  id: string;
  email: string;
  name: string | null;
  verifiedBadge: string | null;
  emailVerified: boolean;
  claimedCompany: { id: string; name: string; slug: string } | null;
  createdAt: string;
  note: VerificationNote | null;
}

export default function AdminVerificationPage() {
  const { data: session, status } = useSession();

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [denyReasonFor, setDenyReasonFor] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verification');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(extractApiError(data, 'Failed to load requests'));
        return;
      }
      const json = await res.json();
      setRequests(json.data?.requests ?? []);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchRequests();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [status, session?.user?.isAdmin, fetchRequests]);

  const handleApprove = async (userId: string, badge: RequestableBadge) => {
    setActioningId(userId);
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, decision: 'approve', badge }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to approve request'));
        return;
      }
      toast.success(`Approved ${badge} badge`);
      setRequests((prev) => prev.filter((r) => r.id !== userId));
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDeny = async (userId: string) => {
    setActioningId(userId);
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          decision: 'deny',
          reason: denyReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to deny request'));
        return;
      }
      toast.success('Request denied');
      setRequests((prev) => prev.filter((r) => r.id !== userId));
      setDenyReasonFor(null);
      setDenyReason('');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <nav className="text-sm text-slate-400 mb-4">
          <Link href="/admin" className="hover:text-white transition-colors">
            Admin
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-white/70">Verification</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Verification Queue</h1>
            <p className="text-slate-400">
              Review pending badge requests. Approve to grant founder/investor/media.
            </p>
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-12 text-center">
            <h2 className="text-lg font-semibold mb-1">No pending requests</h2>
            <p className="text-sm text-slate-400">
              All verification requests have been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onApprove={handleApprove}
                onDeny={handleDeny}
                isActioning={actioningId === req.id}
                showDenyForm={denyReasonFor === req.id}
                denyReason={denyReason}
                onStartDeny={() => {
                  setDenyReasonFor(req.id);
                  setDenyReason('');
                }}
                onCancelDeny={() => {
                  setDenyReasonFor(null);
                  setDenyReason('');
                }}
                onChangeDenyReason={setDenyReason}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RequestCardProps {
  request: PendingRequest;
  onApprove: (userId: string, badge: RequestableBadge) => void;
  onDeny: (userId: string) => void;
  isActioning: boolean;
  showDenyForm: boolean;
  denyReason: string;
  onStartDeny: () => void;
  onCancelDeny: () => void;
  onChangeDenyReason: (v: string) => void;
}

function RequestCard({
  request,
  onApprove,
  onDeny,
  isActioning,
  showDenyForm,
  denyReason,
  onStartDeny,
  onCancelDeny,
  onChangeDenyReason,
}: RequestCardProps) {
  const requestedBadge = (request.note?.requestedBadge || 'founder') as RequestableBadge;
  const [selectedBadge, setSelectedBadge] = useState<RequestableBadge>(
    ['founder', 'investor', 'media'].includes(requestedBadge) ? requestedBadge : 'founder'
  );
  const links = request.note?.links ?? {};

  return (
    <article className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-6">
      <header className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-white truncate">
              {request.name || 'Unnamed user'}
            </h2>
            <VerifiedBadge badge={request.verifiedBadge} size="md" />
          </div>
          <p className="text-sm text-slate-400 truncate">{request.email}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            <span>
              Submitted{' '}
              {request.note?.submittedAt
                ? new Date(request.note.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'recently'}
            </span>
            {request.emailVerified && (
              <span className="text-green-400">Email verified</span>
            )}
            {request.claimedCompany && (
              <Link
                href={`/company-profiles/${request.claimedCompany.slug}`}
                className="text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Claimed: {request.claimedCompany.name}
              </Link>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>Requested:</span>
          <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white/90 font-medium capitalize">
            {requestedBadge}
          </span>
        </div>
      </header>

      {request.note?.justification && (
        <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-3 mb-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Justification
          </p>
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {request.note.justification}
          </p>
        </div>
      )}

      {(links.website || links.linkedinUrl || links.supportingUrl) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {links.website && (
            <a
              href={links.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-blue-300 rounded transition-colors"
            >
              Website ↗
            </a>
          )}
          {links.linkedinUrl && (
            <a
              href={links.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-blue-300 rounded transition-colors"
            >
              LinkedIn ↗
            </a>
          )}
          {links.supportingUrl && (
            <a
              href={links.supportingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-blue-300 rounded transition-colors"
            >
              Supporting link ↗
            </a>
          )}
        </div>
      )}

      {showDenyForm ? (
        <div className="border-t border-white/[0.06] pt-4">
          <label className="block text-xs text-slate-400 mb-1.5">
            Reason (optional — shared with the user)
          </label>
          <textarea
            value={denyReason}
            onChange={(e) => onChangeDenyReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Justification didn't establish founder role at a space-industry company."
            className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onDeny(request.id)}
              disabled={isActioning}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isActioning ? 'Denying...' : 'Confirm Deny'}
            </button>
            <button
              onClick={onCancelDeny}
              disabled={isActioning}
              className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/[0.06] pt-4 flex items-center gap-3 flex-wrap">
          <select
            value={selectedBadge}
            onChange={(e) => setSelectedBadge(e.target.value as RequestableBadge)}
            disabled={isActioning}
            className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
          >
            <option value="founder">Founder</option>
            <option value="investor">Investor</option>
            <option value="media">Media / Press</option>
          </select>
          <button
            onClick={() => onApprove(request.id, selectedBadge)}
            disabled={isActioning}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isActioning ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={onStartDeny}
            disabled={isActioning}
            className="px-4 py-2 border border-red-500/40 text-red-300 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      )}
    </article>
  );
}
