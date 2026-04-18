'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const dynamic = 'force-dynamic';

interface PendingCredential {
  id: string;
  credentialType: string;
  title: string;
  issuingOrg: string;
  issuedAt: string | null;
  expiresAt: string | null;
  credentialId: string | null;
  verificationUrl: string | null;
  supportingDocUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    verifiedBadge: string | null;
    emailVerified: boolean;
  } | null;
}

export default function AdminCredentialsPage() {
  const { data: session, status } = useSession();
  const [credentials, setCredentials] = useState<PendingCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/credentials');
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to load queue'));
        return;
      }
      setCredentials(data.data?.credentials ?? []);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchQueue();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [status, session?.user?.isAdmin, fetchQueue]);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/credentials/${id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to approve credential'));
        return;
      }
      toast.success('Credential verified');
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/credentials/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'reject',
          rejectionReason: rejectReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to reject credential'));
        return;
      }
      toast.success('Credential rejected');
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      setRejectingId(null);
      setRejectReason('');
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
          <span className="text-white/70">Credentials</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Credential Verification Queue</h1>
            <p className="text-slate-400">
              Review pending professional credentials. Approve to grant a verified badge.
            </p>
          </div>
          <button
            onClick={fetchQueue}
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
        ) : credentials.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-12 text-center">
            <h2 className="text-lg font-semibold mb-1">Queue is empty</h2>
            <p className="text-sm text-slate-400">
              No credentials are awaiting review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map((cred) => (
              <article
                key={cred.id}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-6"
              >
                <header className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 capitalize font-medium">
                        {cred.credentialType}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-700/50 font-medium">
                        Pending
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-white truncate">
                      {cred.title}
                    </h2>
                    <p className="text-sm text-slate-400 truncate">
                      {cred.issuingOrg}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Submitted{' '}
                      {new Date(cred.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      by{' '}
                      <span className="text-slate-300">
                        {cred.user?.name || cred.user?.email || 'Unknown user'}
                      </span>
                      {cred.user?.emailVerified && (
                        <span className="ml-2 text-green-400">Email verified</span>
                      )}
                    </p>
                  </div>
                </header>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  {cred.issuedAt && (
                    <div>
                      <dt className="text-slate-500">Issued</dt>
                      <dd className="text-slate-200">
                        {new Date(cred.issuedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </dd>
                    </div>
                  )}
                  {cred.expiresAt && (
                    <div>
                      <dt className="text-slate-500">Expires</dt>
                      <dd className="text-slate-200">
                        {new Date(cred.expiresAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </dd>
                    </div>
                  )}
                  {cred.credentialId && (
                    <div>
                      <dt className="text-slate-500">Credential ID</dt>
                      <dd className="text-slate-200 truncate" title={cred.credentialId}>
                        {cred.credentialId}
                      </dd>
                    </div>
                  )}
                  {cred.user?.email && (
                    <div>
                      <dt className="text-slate-500">Submitter email</dt>
                      <dd className="text-slate-200 truncate" title={cred.user.email}>
                        {cred.user.email}
                      </dd>
                    </div>
                  )}
                </dl>

                {(cred.verificationUrl || cred.supportingDocUrl) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {cred.verificationUrl && (
                      <a
                        href={cred.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-blue-300 rounded transition-colors"
                      >
                        Verification link ↗
                      </a>
                    )}
                    {cred.supportingDocUrl && (
                      <a
                        href={cred.supportingDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-blue-300 rounded transition-colors"
                      >
                        Supporting doc ↗
                      </a>
                    )}
                  </div>
                )}

                {rejectingId === cred.id ? (
                  <div className="border-t border-white/[0.06] pt-4">
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Reason (optional — shared with the user)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="e.g. Verification link does not show the credential."
                      className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(cred.id)}
                        disabled={actioningId === cred.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {actioningId === cred.id ? 'Rejecting...' : 'Confirm reject'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        disabled={actioningId === cred.id}
                        className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-white/[0.06] pt-4 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => handleApprove(cred.id)}
                      disabled={actioningId !== null}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {actioningId === cred.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(cred.id);
                        setRejectReason('');
                      }}
                      disabled={actioningId !== null}
                      className="px-4 py-2 border border-red-500/40 text-red-300 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
