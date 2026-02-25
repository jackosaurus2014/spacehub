'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'all-users' | 'admin-management' | 'audit-log';

interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  adminRole: string | null;
  isBanned: boolean;
  isMuted: boolean;
  createdAt: string;
  reputation: number;
  forumPostCount: number;
}

interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  admin: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_BADGES: Record<string, { label: string; className: string }> = {
  super_admin: {
    label: 'Super Admin',
    className: 'bg-red-500/20 text-red-300 border border-red-500/30',
  },
  moderator: {
    label: 'Moderator',
    className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  },
  data_analyst: {
    label: 'Data Analyst',
    className: 'bg-green-500/20 text-green-300 border border-green-500/30',
  },
  admin: {
    label: 'Admin',
    className: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  },
};

const AUDIT_ACTION_STYLES: Record<string, string> = {
  grant_admin: 'bg-green-500/20 text-green-300',
  revoke_admin: 'bg-red-500/20 text-red-300',
  update_role: 'bg-blue-500/20 text-blue-300',
  ban_user: 'bg-red-500/20 text-red-300',
  mute_user: 'bg-amber-500/20 text-amber-300',
  unban_user: 'bg-green-500/20 text-green-300',
  unmute_user: 'bg-green-500/20 text-green-300',
  seed_data: 'bg-purple-500/20 text-purple-300',
  refresh_data: 'bg-cyan-500/20 text-cyan-300',
  moderation_action: 'bg-orange-500/20 text-orange-300',
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const { data: session, status: authStatus } = useSession();
  const [tab, setTab] = useState<Tab>('all-users');

  if (authStatus === 'loading') {
    return <LoadingSkeleton />;
  }

  if (!session?.user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <svg className="mx-auto h-12 w-12 text-star-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h1 className="text-2xl font-display font-bold text-white mt-4">Access Denied</h1>
          <p className="text-star-300 mt-2">Admin access required.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all-users', label: 'All Users' },
    { key: 'admin-management', label: 'Admin Management' },
    { key: 'audit-log', label: 'Audit Log' },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white">User Management</h1>
          <p className="text-star-300 mt-1">Manage users, admin roles, and view audit logs.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-space-600/50 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-nebula-500 text-white'
                  : 'border-transparent text-star-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'all-users' && <AllUsersTab />}
        {tab === 'admin-management' && <AdminManagementTab currentUserId={session.user.id} />}
        {tab === 'audit-log' && <AuditLogTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// All Users Tab
// ---------------------------------------------------------------------------

function AllUsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '20');
      params.set('filter', filter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Failed to fetch users (${res.status})`);
      }
      const data = await res.json();
      setUsers(data.data?.users || []);
      setPagination(data.data?.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const handleQuickAction = async (userId: string, action: string, duration?: number) => {
    setActioningId(userId);
    try {
      const res = await fetch(`/api/admin/moderation/users/${userId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: `Quick action from user management: ${action}`,
          duration,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Action failed');
      }
      toast.success(`${action} action executed successfully`);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setActioningId(null);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    setActioningId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to promote user');
      }
      toast.success('User promoted to admin');
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to promote user');
    } finally {
      setActioningId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
          <label htmlFor="user-search" className="block text-xs font-medium text-star-400 mb-1">Search Users</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-star-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              id="user-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input pl-10 w-full"
            />
          </div>
        </form>
        <div>
          <label htmlFor="user-filter" className="block text-xs font-medium text-star-400 mb-1">Filter</label>
          <select
            id="user-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Users</option>
            <option value="admins">Admins Only</option>
            <option value="banned">Banned</option>
            <option value="muted">Muted</option>
          </select>
        </div>
        {pagination && (
          <div className="text-sm text-star-400 self-end pb-2">
            {pagination.total} user{pagination.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="card border border-red-500/30 p-4">
          <p className="text-red-400 font-medium">Error loading users</p>
          <p className="text-red-300 text-sm mt-1">{error}</p>
          <button onClick={fetchUsers} className="text-red-300 underline hover:no-underline text-sm mt-2">
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && users.length === 0 && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-star-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <h3 className="mt-3 text-lg font-medium text-white">No users found</h3>
          <p className="text-star-300 mt-1 text-sm">
            {search ? 'Try a different search term.' : 'No users match the selected filter.'}
          </p>
        </div>
      )}

      {/* User Table */}
      {!loading && !error && users.length > 0 && (
        <div className="card border border-space-600/50 overflow-hidden">
          {/* Table Header */}
          <div className="hidden lg:grid lg:grid-cols-7 gap-4 px-4 py-3 bg-space-700/50 border-b border-space-600/50 text-xs font-medium text-star-400 uppercase tracking-wider">
            <div className="col-span-2">User</div>
            <div>Status</div>
            <div>Role</div>
            <div>Reputation</div>
            <div>Joined</div>
            <div>Actions</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-space-600/30">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3 lg:grid lg:grid-cols-7 gap-4 items-center hover:bg-space-700/30 transition-colors">
                {/* User info */}
                <div className="col-span-2 min-w-0">
                  <p className="text-white font-medium truncate">{user.name || 'No name'}</p>
                  <p className="text-star-400 text-sm truncate">{user.email}</p>
                </div>

                {/* Status */}
                <div className="mt-1 lg:mt-0 flex flex-wrap gap-1">
                  {user.isBanned && (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      Banned
                    </span>
                  )}
                  {user.isMuted && (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Muted
                    </span>
                  )}
                  {!user.isBanned && !user.isMuted && (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                      Active
                    </span>
                  )}
                </div>

                {/* Role */}
                <div className="mt-1 lg:mt-0">
                  {user.isAdmin ? (
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                      ROLE_BADGES[user.adminRole || 'admin']?.className || ROLE_BADGES.admin.className
                    }`}>
                      {ROLE_BADGES[user.adminRole || 'admin']?.label || 'Admin'}
                    </span>
                  ) : (
                    <span className="text-star-500 text-xs">User</span>
                  )}
                </div>

                {/* Reputation */}
                <div className="mt-1 lg:mt-0 text-star-300 text-sm">
                  {user.reputation} pts / {user.forumPostCount} posts
                </div>

                {/* Joined */}
                <div className="mt-1 lg:mt-0 text-star-400 text-sm">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </div>

                {/* Actions */}
                <div className="mt-2 lg:mt-0 flex flex-wrap gap-1">
                  {!user.isBanned ? (
                    <button
                      onClick={() => handleQuickAction(user.id, 'ban')}
                      disabled={actioningId === user.id}
                      className="px-2 py-1 text-xs font-medium rounded border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    >
                      Ban
                    </button>
                  ) : (
                    <button
                      onClick={() => handleQuickAction(user.id, 'unban')}
                      disabled={actioningId === user.id}
                      className="px-2 py-1 text-xs font-medium rounded border border-green-500/30 text-green-300 hover:bg-green-500/10 disabled:opacity-50 transition-colors"
                    >
                      Unban
                    </button>
                  )}
                  {!user.isMuted ? (
                    <button
                      onClick={() => handleQuickAction(user.id, 'mute', 1440)}
                      disabled={actioningId === user.id}
                      className="px-2 py-1 text-xs font-medium rounded border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 disabled:opacity-50 transition-colors"
                    >
                      Mute
                    </button>
                  ) : (
                    <button
                      onClick={() => handleQuickAction(user.id, 'unmute')}
                      disabled={actioningId === user.id}
                      className="px-2 py-1 text-xs font-medium rounded border border-green-500/30 text-green-300 hover:bg-green-500/10 disabled:opacity-50 transition-colors"
                    >
                      Unmute
                    </button>
                  )}
                  {!user.isAdmin && (
                    <button
                      onClick={() => handlePromoteToAdmin(user.id)}
                      disabled={actioningId === user.id}
                      className="px-2 py-1 text-xs font-medium rounded border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 disabled:opacity-50 transition-colors"
                    >
                      Promote
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium rounded-md border border-space-600/50 text-star-300 hover:bg-space-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-star-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 text-sm font-medium rounded-md border border-space-600/50 text-star-300 hover:bg-space-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Management Tab
// ---------------------------------------------------------------------------

function AdminManagementTab({ currentUserId }: { currentUserId: string }) {
  const [admins, setAdmins] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users?filter=admins&limit=100');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to fetch admins');
      }
      const data = await res.json();
      const adminUsers = data.data?.users || [];
      setAdmins(adminUsers);

      // Determine current user's role
      const currentAdmin = adminUsers.find((u: UserRecord) => u.id === currentUserId);
      setCurrentUserRole(currentAdmin?.adminRole || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const canManageRoles = currentUserRole === null || currentUserRole === 'super_admin';

  const handleRoleChange = async (userId: string, isAdmin: boolean, adminRole: string | null) => {
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin, adminRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to update role');
      }
      toast.success(isAdmin ? 'Role updated successfully' : 'Admin access revoked');
      setEditingId(null);
      fetchAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border border-red-500/30 p-4">
        <p className="text-red-400 font-medium">Error loading admins</p>
        <p className="text-red-300 text-sm mt-1">{error}</p>
        <button onClick={fetchAdmins} className="text-red-300 underline hover:no-underline text-sm mt-2">
          Try again
        </button>
      </div>
    );
  }

  if (admins.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto h-12 w-12 text-star-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <h3 className="mt-3 text-lg font-medium text-white">No admin users</h3>
        <p className="text-star-300 mt-1 text-sm">Promote users from the All Users tab.</p>
      </div>
    );
  }

  return (
    <div>
      {!canManageRoles && (
        <div className="card border border-amber-500/30 bg-amber-500/5 p-3 mb-6">
          <p className="text-amber-300 text-sm">
            Only super admins can change admin roles. You can view the admin roster below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map((admin) => {
          const badge = ROLE_BADGES[admin.adminRole || 'admin'] || ROLE_BADGES.admin;
          const isEditing = editingId === admin.id;
          const isSaving = savingId === admin.id;
          const isSelf = admin.id === currentUserId;

          return (
            <div key={admin.id} className="card border border-space-600/50 p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold truncate">{admin.name || 'No name'}</p>
                  <p className="text-star-400 text-sm truncate">{admin.email}</p>
                </div>
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-star-400 mb-3">
                <span>{admin.reputation} reputation</span>
                <span>{admin.forumPostCount} posts</span>
              </div>

              <p className="text-xs text-star-500 mb-3">
                Joined {new Date(admin.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </p>

              {/* Role Controls */}
              {canManageRoles && !isSelf && (
                <div className="border-t border-space-600/30 pt-3">
                  {!isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(admin.id);
                          setEditRole(admin.adminRole || '');
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded border border-blue-500/30 text-blue-300 hover:bg-blue-500/10 transition-colors"
                      >
                        Change Role
                      </button>
                      <button
                        onClick={() => handleRoleChange(admin.id, false, null)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs font-medium rounded border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        Revoke Admin
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="input text-sm w-full"
                      >
                        <option value="">Basic Admin</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="moderator">Moderator</option>
                        <option value="data_analyst">Data Analyst</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRoleChange(admin.id, true, editRole || null)}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-xs font-medium rounded bg-nebula-600 text-white hover:bg-nebula-500 disabled:opacity-50 transition-colors"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditRole('');
                          }}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-xs font-medium rounded border border-space-600/50 text-star-300 hover:bg-space-700/50 disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isSelf && (
                <div className="border-t border-space-600/30 pt-3">
                  <p className="text-xs text-star-500 italic">This is your account</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Log Tab
// ---------------------------------------------------------------------------

function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Failed to fetch audit logs (${res.status})`);
      }
      const data = await res.json();
      setLogs(data.data?.logs || []);
      setPagination(data.data?.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  // Filter logs by admin name client-side (since we already have admin info)
  const filteredLogs = adminSearch
    ? logs.filter((log) => {
        const adminName = (log.admin?.name || log.admin?.email || '').toLowerCase();
        return adminName.includes(adminSearch.toLowerCase());
      })
    : logs;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label htmlFor="action-filter" className="block text-xs font-medium text-star-400 mb-1">Action Type</label>
          <select
            id="action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input"
          >
            <option value="">All Actions</option>
            <option value="grant_admin">Grant Admin</option>
            <option value="revoke_admin">Revoke Admin</option>
            <option value="update_role">Update Role</option>
            <option value="ban_user">Ban User</option>
            <option value="unban_user">Unban User</option>
            <option value="mute_user">Mute User</option>
            <option value="unmute_user">Unmute User</option>
            <option value="seed_data">Seed Data</option>
            <option value="refresh_data">Refresh Data</option>
            <option value="moderation_action">Moderation Action</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="admin-search" className="block text-xs font-medium text-star-400 mb-1">Search by Admin</label>
          <input
            id="admin-search"
            type="text"
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            placeholder="Filter by admin name..."
            className="input w-full"
          />
        </div>
        {pagination && (
          <div className="text-sm text-star-400 self-end pb-2">
            {pagination.total} log{pagination.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="card border border-red-500/30 p-4">
          <p className="text-red-400 font-medium">Error loading audit logs</p>
          <p className="text-red-300 text-sm mt-1">{error}</p>
          <button onClick={fetchLogs} className="text-red-300 underline hover:no-underline text-sm mt-2">
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredLogs.length === 0 && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-star-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="mt-3 text-lg font-medium text-white">No audit logs found</h3>
          <p className="text-star-300 mt-1 text-sm">
            {actionFilter || adminSearch ? 'Try adjusting your filters.' : 'Admin actions will be recorded here.'}
          </p>
        </div>
      )}

      {/* Audit Log Table */}
      {!loading && !error && filteredLogs.length > 0 && (
        <div className="card border border-space-600/50 overflow-hidden">
          {/* Table Header */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-4 px-4 py-3 bg-space-700/50 border-b border-space-600/50 text-xs font-medium text-star-400 uppercase tracking-wider">
            <div>Date</div>
            <div>Admin</div>
            <div>Action</div>
            <div>Resource</div>
            <div>Details</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-space-600/30">
            {filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              const actionStyle = AUDIT_ACTION_STYLES[log.action] || 'bg-space-600/30 text-star-300';

              return (
                <div key={log.id} className="px-4 py-3 hover:bg-space-700/30 transition-colors">
                  <div className="lg:grid lg:grid-cols-5 gap-4 items-center">
                    {/* Date */}
                    <div className="text-star-300 text-sm">
                      <span className="lg:hidden text-xs font-medium text-star-500 mr-1">Date:</span>
                      {new Date(log.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'UTC',
                      })}
                    </div>

                    {/* Admin */}
                    <div className="mt-1 lg:mt-0 text-sm">
                      <span className="lg:hidden text-xs font-medium text-star-500 mr-1">Admin:</span>
                      <span className="text-white font-medium">
                        {log.admin?.name || log.admin?.email || log.adminId.slice(0, 8) + '...'}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="mt-1 lg:mt-0">
                      <span className="lg:hidden text-xs font-medium text-star-500 mr-1">Action:</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${actionStyle}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Resource */}
                    <div className="mt-1 lg:mt-0 text-star-300 text-sm">
                      <span className="lg:hidden text-xs font-medium text-star-500 mr-1">Resource:</span>
                      {log.resource}
                      {log.resourceId && (
                        <span className="text-star-500 ml-1">({log.resourceId.slice(0, 8)}...)</span>
                      )}
                    </div>

                    {/* Details toggle */}
                    <div className="mt-1 lg:mt-0">
                      {log.details && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors"
                        >
                          {isExpanded ? 'Hide details' : 'Show details'}
                        </button>
                      )}
                      {!log.details && (
                        <span className="text-star-500 text-xs">--</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && log.details && (
                    <div className="mt-3 p-3 rounded bg-space-800/50 border border-space-600/30">
                      <pre className="text-xs text-star-300 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                      {log.ipAddress && (
                        <p className="text-xs text-star-500 mt-2">IP: {log.ipAddress}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium rounded-md border border-space-600/50 text-star-300 hover:bg-space-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-star-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 text-sm font-medium rounded-md border border-space-600/50 text-star-300 hover:bg-space-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <div className="h-8 w-64 bg-space-700 rounded animate-pulse" />
          <div className="h-4 w-96 bg-space-700 rounded animate-pulse mt-2" />
        </div>
        <div className="flex border-b border-space-600/50 mb-6">
          <div className="h-8 w-24 bg-space-700 rounded animate-pulse mr-4" />
          <div className="h-8 w-32 bg-space-700 rounded animate-pulse mr-4" />
          <div className="h-8 w-20 bg-space-700 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card border border-space-600/50 p-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-40 bg-space-700 rounded animate-pulse" />
                <div className="h-5 w-16 bg-space-700 rounded-full animate-pulse" />
                <div className="ml-auto flex gap-2">
                  <div className="h-7 w-12 bg-space-700 rounded animate-pulse" />
                  <div className="h-7 w-12 bg-space-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
