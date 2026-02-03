'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { FEATURE_REQUEST_STATUSES, HELP_REQUEST_STATUSES } from '@/types';
import type { FeatureRequest, HelpRequest } from '@/types';
import { AVAILABLE_MODULES } from '@/types';

type Tab = 'feature' | 'help';

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();
  const [tab, setTab] = useState<Tab>('feature');
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'feature') {
        const res = await fetch('/api/feature-requests');
        if (res.ok) {
          const data = await res.json();
          setFeatureRequests(data.featureRequests);
        }
      } else {
        const res = await fetch('/api/help-requests');
        if (res.ok) {
          const data = await res.json();
          setHelpRequests(data.helpRequests);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchData();
    }
  }, [session, tab, fetchData]);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-nebula-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-2xl font-display font-bold text-white mb-4">Access Denied</h1>
          <p className="text-star-300">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-display font-bold text-white mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex border-b border-space-600/50 mb-6">
          <button
            onClick={() => setTab('feature')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              tab === 'feature'
                ? 'border-nebula-500 text-white'
                : 'border-transparent text-star-300 hover:text-white'
            }`}
          >
            Feature Requests
          </button>
          <button
            onClick={() => setTab('help')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              tab === 'help'
                ? 'border-nebula-500 text-white'
                : 'border-transparent text-star-300 hover:text-white'
            }`}
          >
            Help Requests
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-nebula-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'feature' ? (
          <FeatureRequestList items={featureRequests} onUpdate={fetchData} />
        ) : (
          <HelpRequestList items={helpRequests} onUpdate={fetchData} />
        )}
      </div>
    </div>
  );
}

function FeatureRequestList({ items, onUpdate }: { items: FeatureRequest[]; onUpdate: () => void }) {
  if (items.length === 0) {
    return <p className="text-star-300 text-center py-12">No feature requests yet.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <FeatureRequestItem key={item.id} item={item} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

function FeatureRequestItem({ item, onUpdate }: { item: FeatureRequest; onUpdate: () => void }) {
  const [status, setStatus] = useState(item.status);
  const [adminNotes, setAdminNotes] = useState(item.adminNotes || '');
  const [saving, setSaving] = useState(false);

  const moduleName = item.module
    ? AVAILABLE_MODULES.find((m) => m.moduleId === item.module)?.name || item.module
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/feature-requests/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const statusInfo = FEATURE_REQUEST_STATUSES.find((s) => s.value === item.status);

  return (
    <div className="card p-5 border border-space-600/50">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-white font-semibold">{item.title}</h3>
          <p className="text-star-300 text-sm">
            {item.email} &middot; {new Date(item.createdAt).toLocaleDateString()} &middot;{' '}
            {item.type === 'existing_module' ? `Module: ${moduleName}` : 'New Module'}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${statusInfo?.color || 'bg-gray-500'} text-white`}>
          {statusInfo?.label || item.status}
        </span>
      </div>
      <p className="text-star-200 text-sm mb-4 whitespace-pre-wrap">{item.details}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FeatureRequest['status'])}
          className="input text-sm flex-shrink-0"
        >
          {FEATURE_REQUEST_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Admin notes..."
          rows={1}
          className="input text-sm flex-1 resize-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm py-1.5 px-4 flex-shrink-0 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function HelpRequestList({ items, onUpdate }: { items: HelpRequest[]; onUpdate: () => void }) {
  if (items.length === 0) {
    return <p className="text-star-300 text-center py-12">No help requests yet.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <HelpRequestItem key={item.id} item={item} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

function HelpRequestItem({ item, onUpdate }: { item: HelpRequest; onUpdate: () => void }) {
  const [status, setStatus] = useState(item.status);
  const [adminResponse, setAdminResponse] = useState(item.adminResponse || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/help-requests/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminResponse }),
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const statusInfo = HELP_REQUEST_STATUSES.find((s) => s.value === item.status);

  return (
    <div className="card p-5 border border-space-600/50">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-white font-semibold">{item.subject}</h3>
          <p className="text-star-300 text-sm">
            {item.email} &middot; {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${statusInfo?.color || 'bg-gray-500'} text-white`}>
          {statusInfo?.label || item.status}
        </span>
      </div>
      <p className="text-star-200 text-sm mb-4 whitespace-pre-wrap">{item.details}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as HelpRequest['status'])}
          className="input text-sm flex-shrink-0"
        >
          {HELP_REQUEST_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <textarea
          value={adminResponse}
          onChange={(e) => setAdminResponse(e.target.value)}
          placeholder="Admin response..."
          rows={1}
          className="input text-sm flex-1 resize-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm py-1.5 px-4 flex-shrink-0 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
