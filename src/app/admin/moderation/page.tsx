'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'reports' | 'users' | 'action-log';

interface Reporter {
  id: string;
  name: string | null;
  email: string | null;
}

interface ContentReport {
  id: string;
  reporterId: string;
  reporter: Reporter;
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserResult {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  isBanned?: boolean;
  isMuted?: boolean;
  mutedUntil?: string | null;
  bannedAt?: string | null;
  banReason?: string | null;
}

interface ModerationActionRecord {
  id: string;
  moderatorId: string;
  targetUserId: string;
  action: string;
  reason: string | null;
  contentType: string | null;
  contentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  itar_violation: 'ITAR/EAR Violation',
  copyright: 'Copyright',
  inappropriate: 'Inappropriate',
  hate_speech: 'Hate Speech',
  doxxing: 'Doxxing',
  impersonation: 'Impersonation',
  other: 'Other',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-300',
  reviewed: 'bg-blue-100 text-blue-800 border border-blue-300',
  actioned: 'bg-green-100 text-green-800 border border-green-300',
  dismissed: 'bg-slate-100 text-slate-600 border border-slate-300',
};

const CONTENT_TYPE_STYLES: Record<string, string> = {
  thread: 'bg-purple-100 text-purple-700',
  post: 'bg-sky-100 text-sky-700',
  message: 'bg-rose-100 text-rose-700',
  profile: 'bg-teal-100 text-teal-700',
};

const ACTION_LABELS: Record<string, string> = {
  warn: 'Warning',
  mute: 'Mute',
  unmute: 'Unmute',
  ban: 'Ban',
  unban: 'Unban',
  delete_content: 'Content Deleted',
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ModerationDashboard() {
  const { data: session, status: authStatus } = useSession();
  const [tab, setTab] = useState<Tab>('reports');

  // Auth loading state
  if (authStatus === 'loading') {
    return <LoadingSkeleton />;
  }

  // Not an admin
  if (!session?.user?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-slate-600 mt-2">Admin access required.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'reports', label: 'Reports' },
    { key: 'users', label: 'Users' },
    { key: 'action-log', label: 'Action Log' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Moderation Dashboard</h1>
          <p className="text-slate-500 mt-1">Review reports, manage users, and track moderation actions.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'action-log' && <ActionLogTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports Tab
// ---------------------------------------------------------------------------

function ReportsTab() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (contentTypeFilter !== 'all') params.set('contentType', contentTypeFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/admin/moderation/reports?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to fetch reports (${res.status})`);
      }
      const data = await res.json();
      setReports(data.data?.reports || []);
      setPagination(data.data?.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, contentTypeFilter, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, contentTypeFilter]);

  const handleReportAction = async (reportId: string, status: string, reviewNote?: string) => {
    setActioningId(reportId);
    try {
      const res = await fetch(`/api/admin/moderation/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNote }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update report');
      }
      toast.success(`Report ${status === 'dismissed' ? 'dismissed' : status === 'reviewed' ? 'marked as reviewed' : 'action taken'}`);
      fetchReports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div>
          <label htmlFor="status-filter" className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-40 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="actioned">Actioned</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <div>
          <label htmlFor="type-filter" className="block text-xs font-medium text-slate-500 mb-1">Content Type</label>
          <select
            id="type-filter"
            value={contentTypeFilter}
            onChange={(e) => setContentTypeFilter(e.target.value)}
            className="block w-40 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="thread">Thread</option>
            <option value="post">Post</option>
            <option value="message">Message</option>
            <option value="profile">Profile</option>
          </select>
        </div>
        {pagination && (
          <div className="ml-auto text-sm text-slate-500 self-end pb-1">
            {pagination.total} report{pagination.total !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Error loading reports</p>
          <p className="mt-1">{error}</p>
          <button onClick={fetchReports} className="mt-2 text-red-800 underline hover:no-underline text-sm">
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reports.length === 0 && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-3 text-lg font-medium text-slate-900">No reports to review</h3>
          <p className="text-slate-500 mt-1 text-sm">
            {statusFilter !== 'all'
              ? `No ${statusFilter} reports found. Try changing the filter.`
              : 'All caught up! No reports have been submitted.'}
          </p>
        </div>
      )}

      {/* Report Cards */}
      {!loading && !error && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              actioning={actioningId === report.id}
              onAction={handleReportAction}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report Card
// ---------------------------------------------------------------------------

function ReportCard({
  report,
  actioning,
  onAction,
}: {
  report: ContentReport;
  actioning: boolean;
  onAction: (id: string, status: string, reviewNote?: string) => void;
}) {
  const [reviewNote, setReviewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const reasonLabel = REASON_LABELS[report.reason] || report.reason;
  const statusStyle = STATUS_STYLES[report.status] || STATUS_STYLES.pending;
  const contentTypeStyle = CONTENT_TYPE_STYLES[report.contentType] || 'bg-slate-100 text-slate-600';
  const reporterName = report.reporter?.name || report.reporter?.email || 'Unknown';
  const reportDate = new Date(report.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const truncatedDescription =
    report.description && report.description.length > 200
      ? report.description.slice(0, 200) + '...'
      : report.description;

  const isPending = report.status === 'pending';

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-semibold text-slate-900">{reasonLabel}</span>
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${contentTypeStyle}`}>
            {report.contentType}
          </span>
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}>
            {report.status}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-2">
        Reported by <span className="font-medium text-slate-700">{reporterName}</span> on {reportDate}
      </p>

      {truncatedDescription && (
        <p className="text-sm text-slate-600 mb-3 bg-slate-50 rounded p-2 border border-slate-100">
          {truncatedDescription}
        </p>
      )}

      {report.reviewNote && (
        <p className="text-xs text-slate-500 mb-3 italic">
          Review note: {report.reviewNote}
        </p>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {showNoteInput && (
            <input
              type="text"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Optional review note..."
              className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          )}
          <div className="flex items-center gap-2 ml-auto">
            {!showNoteInput && (
              <button
                onClick={() => setShowNoteInput(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Add Note
              </button>
            )}
            <button
              onClick={() => onAction(report.id, 'dismissed', reviewNote || undefined)}
              disabled={actioning}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => onAction(report.id, 'reviewed', reviewNote || undefined)}
              disabled={actioning}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              Mark Reviewed
            </button>
            <button
              onClick={() => onAction(report.id, 'actioned', reviewNote || undefined)}
              disabled={actioning}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              Take Action
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------

function UsersTab() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    action: string;
    duration?: number;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const searchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      const res = await fetch(`/api/admin/moderation/users/search?${params.toString()}`);

      if (res.status === 404) {
        // Endpoint may not exist yet -- fall back gracefully
        setUsers([]);
        setError('User search endpoint not available yet. Please create GET /api/admin/moderation/users/search.');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Search failed (${res.status})`);
      }
      const data = await res.json();
      setUsers(data.users || data.data?.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (userId: string, userName: string, action: string, duration?: number) => {
    setConfirmAction({ userId, userName, action, duration });
    setActionReason('');
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    if (!actionReason.trim()) {
      toast.error('Please provide a reason for this action');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/moderation/users/${confirmAction.userId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: confirmAction.action,
          reason: actionReason.trim(),
          duration: confirmAction.duration || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Action failed');
      }
      const actionLabel = ACTION_LABELS[confirmAction.action] || confirmAction.action;
      toast.success(`${actionLabel} applied to ${confirmAction.userName}`);
      setConfirmAction(null);
      setActionReason('');
      // Refresh search results
      searchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div>
      {/* Search Form */}
      <form onSubmit={searchUsers} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user name or email..."
            className="block w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* No Results */}
      {!loading && !error && searched && users.length === 0 && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <h3 className="mt-3 text-lg font-medium text-slate-900">No users found</h3>
          <p className="text-slate-500 mt-1 text-sm">Try a different search term.</p>
        </div>
      )}

      {/* Initial State */}
      {!loading && !error && !searched && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <h3 className="mt-3 text-lg font-medium text-slate-900">Search for a user</h3>
          <p className="text-slate-500 mt-1 text-sm">Enter a name or email to find users and manage their moderation status.</p>
        </div>
      )}

      {/* User Cards */}
      {!loading && !error && users.length > 0 && (
        <div className="space-y-3">
          {users.map((user) => (
            <UserCard key={user.id} user={user} onAction={openConfirmDialog} />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmationDialog
          action={confirmAction.action}
          userName={confirmAction.userName}
          duration={confirmAction.duration}
          reason={actionReason}
          onReasonChange={setActionReason}
          submitting={submittingAction}
          onConfirm={executeAction}
          onCancel={() => {
            setConfirmAction(null);
            setActionReason('');
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Card
// ---------------------------------------------------------------------------

function UserCard({
  user,
  onAction,
}: {
  user: UserResult;
  onAction: (userId: string, userName: string, action: string, duration?: number) => void;
}) {
  const userName = user.name || user.email || 'Unknown User';
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isMutedActive = user.isMuted && user.mutedUntil && new Date(user.mutedUntil) > new Date();

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{userName}</h3>
            {user.isBanned && (
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                Banned
              </span>
            )}
            {isMutedActive && (
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                Muted
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">Joined {joinDate}</p>
          {user.isBanned && user.banReason && (
            <p className="text-xs text-red-600 mt-1">Ban reason: {user.banReason}</p>
          )}
          {isMutedActive && user.mutedUntil && (
            <p className="text-xs text-amber-600 mt-1">
              Muted until {new Date(user.mutedUntil).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onAction(user.id, userName, 'warn')}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Warn
          </button>
          {!isMutedActive ? (
            <>
              <button
                onClick={() => onAction(user.id, userName, 'mute', 1440)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                Mute (24h)
              </button>
              <button
                onClick={() => onAction(user.id, userName, 'mute', 10080)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                Mute (7d)
              </button>
            </>
          ) : (
            <button
              onClick={() => onAction(user.id, userName, 'unmute')}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
            >
              Unmute
            </button>
          )}
          {!user.isBanned ? (
            <button
              onClick={() => onAction(user.id, userName, 'ban')}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              Ban
            </button>
          ) : (
            <button
              onClick={() => onAction(user.id, userName, 'unban')}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
            >
              Unban
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation Dialog
// ---------------------------------------------------------------------------

function ConfirmationDialog({
  action,
  userName,
  duration,
  reason,
  onReasonChange,
  submitting,
  onConfirm,
  onCancel,
}: {
  action: string;
  userName: string;
  duration?: number;
  reason: string;
  onReasonChange: (value: string) => void;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const actionLabel = ACTION_LABELS[action] || action;
  const isDestructive = action === 'ban' || action === 'mute';

  let durationLabel = '';
  if (duration) {
    if (duration >= 1440) {
      durationLabel = ` for ${Math.round(duration / 1440)} day${Math.round(duration / 1440) !== 1 ? 's' : ''}`;
    } else {
      durationLabel = ` for ${duration} minute${duration !== 1 ? 's' : ''}`;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Confirm {actionLabel}
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Are you sure you want to <span className="font-medium">{action}</span>{' '}
          <span className="font-medium">{userName}</span>{durationLabel}?
        </p>
        <div className="mb-4">
          <label htmlFor="action-reason" className="block text-sm font-medium text-slate-700 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="action-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Provide a reason for this action..."
            rows={3}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || !reason.trim()}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white disabled:opacity-50 transition-colors ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {submitting ? 'Processing...' : `Confirm ${actionLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Log Tab
// ---------------------------------------------------------------------------

function ActionLogTab() {
  const [actions, setActions] = useState<ModerationActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/moderation/actions');
        if (res.status === 404) {
          // Endpoint may not exist yet, show placeholder
          setActions([]);
          setError(null);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Failed to fetch action log (${res.status})`);
        }
        const data = await res.json();
        setActions(data.actions || data.data?.actions || []);
      } catch (err) {
        // If endpoint doesn't exist, just show empty state rather than error
        setActions([]);
        setError(null);
      } finally {
        setLoading(false);
      }
    };
    fetchActions();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium">Error loading action log</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <h3 className="mt-3 text-lg font-medium text-slate-900">No moderation actions yet</h3>
        <p className="text-slate-500 mt-1 text-sm">
          Moderation actions will appear here once they are recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <div>Date</div>
        <div>Moderator</div>
        <div>Action</div>
        <div>Target User</div>
        <div>Reason</div>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-slate-100">
        {actions.map((action) => (
          <ActionLogRow key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Log Row
// ---------------------------------------------------------------------------

function ActionLogRow({ action }: { action: ModerationActionRecord }) {
  const actionDate = new Date(action.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const actionLabel = ACTION_LABELS[action.action] || action.action;

  const actionColorClass: Record<string, string> = {
    warn: 'bg-amber-100 text-amber-700',
    mute: 'bg-orange-100 text-orange-700',
    unmute: 'bg-green-100 text-green-700',
    ban: 'bg-red-100 text-red-700',
    unban: 'bg-green-100 text-green-700',
    delete_content: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="px-4 py-3 sm:grid sm:grid-cols-5 gap-4 text-sm">
      {/* Date */}
      <div className="text-slate-600">
        <span className="sm:hidden text-xs font-medium text-slate-400 mr-1">Date:</span>
        {actionDate}
      </div>

      {/* Moderator */}
      <div className="text-slate-700 mt-1 sm:mt-0">
        <span className="sm:hidden text-xs font-medium text-slate-400 mr-1">Moderator:</span>
        <span className="font-medium">{action.moderatorId.slice(0, 8)}...</span>
      </div>

      {/* Action */}
      <div className="mt-1 sm:mt-0">
        <span className="sm:hidden text-xs font-medium text-slate-400 mr-1">Action:</span>
        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${actionColorClass[action.action] || 'bg-slate-100 text-slate-600'}`}>
          {actionLabel}
        </span>
      </div>

      {/* Target User */}
      <div className="text-slate-700 mt-1 sm:mt-0">
        <span className="sm:hidden text-xs font-medium text-slate-400 mr-1">Target:</span>
        <span className="font-medium">{action.targetUserId.slice(0, 8)}...</span>
      </div>

      {/* Reason */}
      <div className="text-slate-500 mt-1 sm:mt-0 truncate">
        <span className="sm:hidden text-xs font-medium text-slate-400 mr-1">Reason:</span>
        {action.reason || '--'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-200 rounded animate-pulse mt-2" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex border-b border-slate-200 mb-6">
          <div className="h-8 w-20 bg-slate-200 rounded animate-pulse mr-4" />
          <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mr-4" />
          <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        {/* Cards skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
                <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-12 w-full bg-slate-100 rounded animate-pulse mb-3" />
              <div className="flex gap-2">
                <div className="h-7 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-7 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
