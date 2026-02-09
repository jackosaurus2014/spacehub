'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from '@/lib/toast';

// ============================================================
// Types
// ============================================================

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  tier: string;
  rateLimitPerMonth: number;
  rateLimitPerMinute: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  totalCalls: number;
  key?: string; // Only present on creation/rotation
}

interface UsageStats {
  totalCalls: number;
  byEndpoint: Array<{ endpoint: string; count: number }>;
  byStatusCode: Array<{ statusCode: number; count: number }>;
  avgResponseTimeMs: number;
  dailyBreakdown: Array<{ date: string; calls: number; errors: number; errorRate: number }>;
  period: string;
  startDate: string;
  endDate: string;
}

// ============================================================
// Constants
// ============================================================

const API_TIERS = [
  {
    name: 'Developer',
    tier: 'developer',
    price: 'Included with Pro',
    monthlyLimit: '5,000',
    perMinute: '60',
    features: [
      '5,000 API calls/month',
      '60 calls/minute burst limit',
      'Up to 3 API keys',
      'All standard endpoints',
      'Community support',
    ],
    highlighted: false,
  },
  {
    name: 'Business',
    tier: 'business',
    price: 'Included with Enterprise',
    monthlyLimit: '50,000',
    perMinute: '300',
    features: [
      '50,000 API calls/month',
      '300 calls/minute burst limit',
      'Up to 10 API keys',
      'All standard endpoints',
      'Priority support',
      'Usage analytics',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    price: 'Included with Enterprise',
    monthlyLimit: 'Unlimited',
    perMinute: '1,000',
    features: [
      'Unlimited API calls',
      '1,000 calls/minute burst limit',
      'Unlimited API keys',
      'All endpoints including Opportunities',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    highlighted: false,
  },
];

const CODE_EXAMPLES = {
  curl: `curl -X GET "https://spacenexus.io/api/v1/launches?limit=5" \\
  -H "Authorization: Bearer snx_YOUR_API_KEY"`,

  javascript: `// Using fetch
const response = await fetch(
  'https://spacenexus.io/api/v1/launches?limit=5',
  {
    headers: {
      'Authorization': 'Bearer snx_YOUR_API_KEY',
    },
  }
);
const data = await response.json();
console.log(data.data); // Array of upcoming launches`,

  axios: `// Using axios
import axios from 'axios';

const { data } = await axios.get(
  'https://spacenexus.io/api/v1/launches',
  {
    params: { limit: 5 },
    headers: {
      'Authorization': 'Bearer snx_YOUR_API_KEY',
    },
  }
);
console.log(data.data); // Array of upcoming launches`,

  python: `import requests

response = requests.get(
    'https://spacenexus.io/api/v1/launches',
    params={'limit': 5},
    headers={
        'Authorization': 'Bearer snx_YOUR_API_KEY',
    },
)
data = response.json()
print(data['data'])  # List of upcoming launches`,
};

// ============================================================
// Sub-Components
// ============================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function ApiKeyCard({
  apiKey,
  onRevoke,
  onRotate,
  onToggle,
}: {
  apiKey: ApiKeyData;
  onRevoke: (id: string) => void;
  onRotate: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const isRevoked = !!apiKey.revokedAt;

  return (
    <div
      className={`border rounded-lg p-4 ${
        isRevoked
          ? 'border-red-500/30 bg-red-500/5 opacity-60'
          : apiKey.isActive
            ? 'border-slate-700 bg-slate-800/50'
            : 'border-yellow-500/30 bg-yellow-500/5'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-white">{apiKey.name}</h4>
          <code className="text-sm text-cyan-400 font-mono">{apiKey.keyPrefix}...</code>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              isRevoked
                ? 'bg-red-500/20 text-red-400'
                : apiKey.isActive
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {isRevoked ? 'Revoked' : apiKey.isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 capitalize">
            {apiKey.tier}
          </span>
        </div>
      </div>

      {apiKey.key && (
        <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm font-semibold mb-1">
            Save this key now -- it will not be shown again:
          </p>
          <div className="flex items-center gap-2">
            <code className="text-sm text-green-300 font-mono break-all flex-1">
              {apiKey.key}
            </code>
            <CopyButton text={apiKey.key} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-sm text-slate-400 mb-3">
        <div>
          <span className="block text-xs text-slate-500">Monthly Limit</span>
          {apiKey.rateLimitPerMonth === -1 ? 'Unlimited' : apiKey.rateLimitPerMonth.toLocaleString()}
        </div>
        <div>
          <span className="block text-xs text-slate-500">Total Calls</span>
          {apiKey.totalCalls.toLocaleString()}
        </div>
        <div>
          <span className="block text-xs text-slate-500">Last Used</span>
          {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString() : 'Never'}
        </div>
      </div>

      {!isRevoked && (
        <div className="flex gap-2 pt-2 border-t border-slate-700">
          <button
            onClick={() => onToggle(apiKey.id, !apiKey.isActive)}
            className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            {apiKey.isActive ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => onRotate(apiKey.id)}
            className="text-xs px-3 py-1.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 transition-colors"
          >
            Rotate
          </button>
          <button
            onClick={() => onRevoke(apiKey.id)}
            className="text-xs px-3 py-1.5 rounded bg-red-600/30 hover:bg-red-600/50 text-red-400 transition-colors"
          >
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function DeveloperPortalPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'usage' | 'docs'>('overview');
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'javascript' | 'axios' | 'python'>('curl');
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);

  // Fetch API keys
  const fetchKeys = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/developer/keys');
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.data);
      }
    } catch {
      // Silently fail
    }
  }, [session?.user]);

  // Fetch usage
  const fetchUsage = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/developer/usage?period=month');
      const data = await res.json();
      if (data.success) {
        setUsage(data.data);
      }
    } catch {
      // Silently fail
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) {
      fetchKeys();
      fetchUsage();
    }
  }, [session?.user, fetchKeys, fetchUsage]);

  // Create new key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }

    setCreatingKey(true);
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('API key created! Save it now -- it will not be shown again.');
        setApiKeys((prev) => [data.data, ...prev]);
        setNewKeyName('');
      } else {
        toast.error(data.error?.message || 'Failed to create API key');
      }
    } catch {
      toast.error('Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  // Revoke key
  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/developer/keys/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('API key revoked');
        fetchKeys();
      } else {
        toast.error(data.error?.message || 'Failed to revoke key');
      }
    } catch {
      toast.error('Failed to revoke key');
    }
  };

  // Rotate key
  const handleRotate = async (id: string) => {
    if (!confirm('Rotate this key? The old key will stop working immediately.')) return;

    try {
      const res = await fetch(`/api/developer/keys/${id}/rotate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('API key rotated! Save the new key now.');
        fetchKeys();
        // Inject the new key with the full key visible
        setApiKeys((prev) => {
          const updated = prev.filter((k) => k.id !== id);
          return [data.data, ...updated];
        });
      } else {
        toast.error(data.error?.message || 'Failed to rotate key');
      }
    } catch {
      toast.error('Failed to rotate key');
    }
  };

  // Toggle key
  const handleToggle = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/developer/keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: active }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`API key ${active ? 'enabled' : 'disabled'}`);
        fetchKeys();
      } else {
        toast.error(data.error?.message || 'Failed to update key');
      }
    } catch {
      toast.error('Failed to update key');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />
        <div className="max-w-6xl mx-auto px-4 py-16 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              SpaceNexus{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Developer API
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
              Access comprehensive space industry data through a simple REST API.
              Launches, companies, satellites, market data, regulatory intelligence, and more.
            </p>
            <div className="flex items-center justify-center gap-4">
              {session?.user ? (
                <button
                  onClick={() => setActiveTab('keys')}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-colors"
                >
                  Manage API Keys
                </button>
              ) : (
                <Link
                  href="/register"
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-colors"
                >
                  Create Account
                </Link>
              )}
              <a
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-slate-600 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors"
              >
                OpenAPI Spec
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 sticky top-0 z-10 bg-slate-950/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {(['overview', 'keys', 'usage', 'docs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-slate-400 border-transparent hover:text-slate-300'
                }`}
              >
                {tab === 'docs' ? 'Documentation' : tab === 'keys' ? 'API Keys' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            {/* Get Started Steps */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Get Started in 3 Steps</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: '1',
                    title: 'Create Account',
                    description: 'Sign up for a SpaceNexus account and subscribe to Pro or Enterprise plan.',
                  },
                  {
                    step: '2',
                    title: 'Generate API Key',
                    description: 'Go to the API Keys tab and create a new key. Save it securely -- it is shown only once.',
                  },
                  {
                    step: '3',
                    title: 'Make Your First Call',
                    description: 'Use your API key in the Authorization header to access any v1 endpoint.',
                  },
                ].map((item) => (
                  <div key={item.step} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg mb-4">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Key Features */}
            <section>
              <h2 className="text-2xl font-bold mb-6">API Features</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: '10 Core Endpoints', desc: 'News, launches, companies, satellites, regulatory, market, weather, contracts, vehicles, opportunities' },
                  { title: 'RESTful JSON API', desc: 'Standard REST conventions with consistent JSON response format' },
                  { title: 'OpenAPI 3.0 Spec', desc: 'Full OpenAPI specification for code generation and documentation' },
                  { title: 'Rate Limiting', desc: 'Transparent rate limits with X-RateLimit headers on every response' },
                  { title: 'Usage Analytics', desc: 'Track your API usage by endpoint, status code, and time period' },
                  { title: 'Key Rotation', desc: 'Seamlessly rotate API keys without downtime' },
                ].map((f) => (
                  <div key={f.title} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-cyan-400 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-400">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Pricing Table */}
            <section>
              <h2 className="text-2xl font-bold mb-6">API Pricing Tiers</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {API_TIERS.map((tier) => (
                  <div
                    key={tier.tier}
                    className={`border rounded-lg p-6 ${
                      tier.highlighted
                        ? 'border-cyan-500 bg-cyan-500/5 relative'
                        : 'border-slate-700 bg-slate-800/30'
                    }`}
                  >
                    {tier.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-cyan-500 text-slate-900 text-xs font-semibold px-3 py-1 rounded-full">
                          Recommended
                        </span>
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                    <p className="text-sm text-cyan-400 mb-4">{tier.price}</p>
                    <div className="mb-4">
                      <div className="text-3xl font-bold">
                        {tier.monthlyLimit}
                        <span className="text-sm text-slate-400 font-normal"> calls/mo</span>
                      </div>
                      <div className="text-sm text-slate-400">
                        {tier.perMinute} calls/min burst
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                          <svg className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-4 text-center">
                API access is included with your SpaceNexus subscription. <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300">View subscription plans</Link>
              </p>
            </section>
          </div>
        )}

        {/* API KEYS TAB */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your API Keys</h2>

            {!session?.user ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                <p className="text-slate-400 mb-4">Sign in to manage your API keys.</p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <>
                {/* Create New Key */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Create New API Key</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Key name (e.g., Production, Development)"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      maxLength={100}
                    />
                    <button
                      onClick={handleCreateKey}
                      disabled={creatingKey || !newKeyName.trim()}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors"
                    >
                      {creatingKey ? 'Creating...' : 'Create Key'}
                    </button>
                  </div>
                </div>

                {/* Key List */}
                {apiKeys.length === 0 ? (
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-8 text-center">
                    <p className="text-slate-400">No API keys yet. Create one above to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apiKeys.map((key) => (
                      <ApiKeyCard
                        key={key.id}
                        apiKey={key}
                        onRevoke={handleRevoke}
                        onRotate={handleRotate}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* USAGE TAB */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Usage Analytics</h2>

            {!session?.user ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                <p className="text-slate-400 mb-4">Sign in to view your usage analytics.</p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              </div>
            ) : !usage ? (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-8 text-center">
                <p className="text-slate-400">Loading usage data...</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Calls', value: usage.totalCalls.toLocaleString() },
                    { label: 'Avg Response', value: `${usage.avgResponseTimeMs}ms` },
                    {
                      label: 'Error Rate',
                      value: usage.totalCalls > 0
                        ? `${(
                            (usage.byStatusCode
                              .filter((s) => s.statusCode >= 400)
                              .reduce((sum, s) => sum + s.count, 0) /
                              usage.totalCalls) *
                            100
                          ).toFixed(1)}%`
                        : '0%',
                    },
                    { label: 'Top Endpoint', value: usage.byEndpoint[0]?.endpoint.replace('/api/v1/', '/') || 'N/A' },
                  ].map((card) => (
                    <div key={card.label} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="text-sm text-slate-400">{card.label}</div>
                      <div className="text-2xl font-bold text-white">{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* Daily Usage Chart (simple bar representation) */}
                {usage.dailyBreakdown.length > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Daily Call Volume</h3>
                    <div className="flex items-end gap-1 h-32">
                      {usage.dailyBreakdown.map((day) => {
                        const maxCalls = Math.max(...usage.dailyBreakdown.map((d) => d.calls), 1);
                        const height = (day.calls / maxCalls) * 100;
                        return (
                          <div
                            key={day.date}
                            className="flex-1 group relative"
                            title={`${day.date}: ${day.calls} calls (${day.errors} errors)`}
                          >
                            <div
                              className="bg-cyan-500/60 hover:bg-cyan-400/80 rounded-t transition-colors"
                              style={{ height: `${Math.max(height, 2)}%` }}
                            />
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-700 text-xs text-white rounded whitespace-nowrap z-10">
                              {day.date}: {day.calls} calls
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top Endpoints */}
                {usage.byEndpoint.length > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Endpoints</h3>
                    <div className="space-y-3">
                      {usage.byEndpoint.slice(0, 10).map((ep) => {
                        const maxCount = usage.byEndpoint[0]?.count || 1;
                        const width = (ep.count / maxCount) * 100;
                        return (
                          <div key={ep.endpoint}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <code className="text-cyan-400">{ep.endpoint}</code>
                              <span className="text-slate-400">{ep.count.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-cyan-500 h-1.5 rounded-full"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* DOCS TAB */}
        {activeTab === 'docs' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">API Documentation</h2>

            {/* Authentication */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Authentication</h3>
              <p className="text-slate-300 mb-3">
                All API requests require authentication via an API key. Pass your key using either method:
              </p>
              <div className="space-y-2 mb-4">
                <div className="bg-slate-900 rounded p-3">
                  <code className="text-sm text-green-400">Authorization: Bearer snx_YOUR_API_KEY</code>
                </div>
                <p className="text-slate-400 text-sm">or</p>
                <div className="bg-slate-900 rounded p-3">
                  <code className="text-sm text-green-400">X-API-Key: snx_YOUR_API_KEY</code>
                </div>
              </div>
            </section>

            {/* Response Format */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Response Format</h3>
              <p className="text-slate-300 mb-3">
                All successful responses follow a consistent format:
              </p>
              <pre className="bg-slate-900 rounded p-4 text-sm overflow-x-auto">
                <code className="text-green-400">{`{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150
  }
}`}</code>
              </pre>
              <p className="text-slate-300 mt-3 mb-3">Error responses:</p>
              <pre className="bg-slate-900 rounded p-4 text-sm overflow-x-auto">
                <code className="text-red-400">{`{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Per-minute rate limit exceeded."
  }
}`}</code>
              </pre>
            </section>

            {/* Rate Limit Headers */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Rate Limit Headers</h3>
              <p className="text-slate-300 mb-3">
                Every response includes rate limit information:
              </p>
              <ul className="space-y-1 text-sm text-slate-400">
                <li><code className="text-yellow-400">X-Request-Id</code> -- Unique identifier for your request</li>
                <li><code className="text-yellow-400">X-RateLimit-Limit</code> -- Your per-minute rate limit</li>
                <li><code className="text-yellow-400">X-RateLimit-Remaining</code> -- Remaining calls in current window (on 429 responses)</li>
                <li><code className="text-yellow-400">X-RateLimit-Reset</code> -- Seconds until the rate limit resets (on 429 responses)</li>
              </ul>
            </section>

            {/* Available Endpoints */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Available Endpoints</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 pr-4 text-slate-400">Endpoint</th>
                      <th className="text-left py-2 pr-4 text-slate-400">Description</th>
                      <th className="text-left py-2 text-slate-400">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {[
                      { path: '/api/v1/news', desc: 'Space news articles', tier: 'All' },
                      { path: '/api/v1/launches', desc: 'Upcoming launches', tier: 'All' },
                      { path: '/api/v1/companies', desc: 'Company profiles', tier: 'All' },
                      { path: '/api/v1/satellites', desc: 'Satellite data', tier: 'All' },
                      { path: '/api/v1/regulatory', desc: 'Regulatory intelligence', tier: 'All' },
                      { path: '/api/v1/market', desc: 'Market/stock data', tier: 'All' },
                      { path: '/api/v1/space-weather', desc: 'Space weather conditions', tier: 'All' },
                      { path: '/api/v1/contracts', desc: 'Government contracts', tier: 'All' },
                      { path: '/api/v1/launch-vehicles', desc: 'Launch vehicle specs', tier: 'All' },
                      { path: '/api/v1/opportunities', desc: 'Business opportunities', tier: 'Enterprise' },
                    ].map((ep) => (
                      <tr key={ep.path} className="border-b border-slate-700/50">
                        <td className="py-2 pr-4">
                          <code className="text-cyan-400">{ep.path}</code>
                        </td>
                        <td className="py-2 pr-4">{ep.desc}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${ep.tier === 'Enterprise' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                            {ep.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Code Examples */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Code Examples</h3>
              <div className="flex gap-2 mb-4">
                {(['curl', 'javascript', 'axios', 'python'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLanguage(lang)}
                    className={`px-3 py-1.5 text-sm rounded ${
                      codeLanguage === lang
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                        : 'bg-slate-700 text-slate-400 hover:text-slate-300 border border-transparent'
                    }`}
                  >
                    {lang === 'curl' ? 'cURL' : lang === 'javascript' ? 'JavaScript' : lang === 'axios' ? 'Axios' : 'Python'}
                  </button>
                ))}
              </div>
              <div className="relative">
                <pre className="bg-slate-900 rounded p-4 text-sm overflow-x-auto">
                  <code className="text-green-400">{CODE_EXAMPLES[codeLanguage]}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={CODE_EXAMPLES[codeLanguage]} />
                </div>
              </div>
            </section>

            {/* OpenAPI Spec Link */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Full API Reference</h3>
              <p className="text-slate-400 mb-4">
                View the complete OpenAPI 3.0 specification for detailed schema definitions,
                request parameters, and response formats.
              </p>
              <a
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-colors"
              >
                View OpenAPI Spec
              </a>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
