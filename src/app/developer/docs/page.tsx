'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import {
  API_CATEGORIES,
  ALL_ENDPOINTS,
  RATE_LIMIT_TIERS,
  COMMON_ERRORS,
  type OpenAPIEndpoint,
  type EndpointParameter,
} from '@/lib/openapi-spec';

// ============================================================
// Constants
// ============================================================

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  POST: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  PUT: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  DELETE: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};

const CODE_LANGUAGES = ['curl', 'python', 'javascript'] as const;
type CodeLanguage = (typeof CODE_LANGUAGES)[number];

const CODE_LABELS: Record<CodeLanguage, string> = {
  curl: 'cURL',
  python: 'Python',
  javascript: 'JavaScript',
};

// ============================================================
// Sub-Components
// ============================================================

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors ${className}`}
      title="Copy to clipboard"
    >
      <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      Copy
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors = METHOD_COLORS[method] || METHOD_COLORS.GET;
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono tracking-wider ${colors.bg} ${colors.text} ${colors.border} border`}
    >
      {method}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const isEnterprise = tier === 'Enterprise';
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        isEnterprise ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
      }`}
    >
      {tier}
    </span>
  );
}

function ParameterTable({ parameters }: { parameters: EndpointParameter[] }) {
  if (parameters.length === 0) {
    return <p className="text-slate-500 text-sm italic">No parameters required.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-2 pr-4 text-slate-400 font-medium">Name</th>
            <th className="text-left py-2 pr-4 text-slate-400 font-medium">Type</th>
            <th className="text-left py-2 pr-4 text-slate-400 font-medium">Required</th>
            <th className="text-left py-2 text-slate-400 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param) => (
            <tr key={param.name} className="border-b border-slate-700/50">
              <td className="py-2.5 pr-4">
                <code className="text-cyan-400 font-mono text-xs">{param.name}</code>
              </td>
              <td className="py-2.5 pr-4">
                <span className="text-slate-300">{param.type}</span>
                {param.enum && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {param.enum.map((v) => (
                      <code key={v} className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">
                        {v}
                      </code>
                    ))}
                  </div>
                )}
              </td>
              <td className="py-2.5 pr-4">
                {param.required ? (
                  <span className="text-red-400 text-xs font-medium">Required</span>
                ) : (
                  <span className="text-slate-500 text-xs">Optional</span>
                )}
              </td>
              <td className="py-2.5 text-slate-300">
                {param.description}
                {param.default !== undefined && (
                  <span className="text-slate-500 ml-1">
                    (default: <code className="text-slate-400">{String(param.default)}</code>)
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeExamples({ endpoint }: { endpoint: OpenAPIEndpoint }) {
  const [activeLang, setActiveLang] = useState<CodeLanguage>('curl');

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        {CODE_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`px-3 py-1.5 text-xs rounded-t font-medium transition-colors ${
              activeLang === lang
                ? 'bg-gray-800 text-cyan-400 border border-b-0 border-slate-600'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-300 border border-b-0 border-transparent'
            }`}
          >
            {CODE_LABELS[lang]}
          </button>
        ))}
      </div>
      <div className="relative">
        <pre className="bg-gray-800 rounded-b rounded-tr p-4 text-sm overflow-x-auto border border-slate-600">
          <code className="text-green-400 whitespace-pre">{endpoint.codeExamples[activeLang]}</code>
        </pre>
        <div className="absolute top-2 right-2">
          <CopyButton text={endpoint.codeExamples[activeLang]} />
        </div>
      </div>
    </div>
  );
}

function JsonBlock({ data, label }: { data: unknown; label?: string }) {
  const jsonString = JSON.stringify(data, null, 2);
  return (
    <div>
      {label && <p className="text-sm text-slate-400 mb-2">{label}</p>}
      <div className="relative">
        <pre className="bg-gray-800 rounded p-4 text-sm overflow-x-auto border border-slate-600 max-h-96">
          <code className="text-green-400 whitespace-pre">{jsonString}</code>
        </pre>
        <div className="absolute top-2 right-2">
          <CopyButton text={jsonString} />
        </div>
      </div>
    </div>
  );
}

function EndpointSection({ endpoint }: { endpoint: OpenAPIEndpoint }) {
  const sectionId = `endpoint-${endpoint.operationId}`;

  return (
    <section id={sectionId} className="scroll-mt-24">
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex flex-wrap items-center gap-3">
          <MethodBadge method={endpoint.method} />
          <code className="text-lg font-mono text-white">/api/v1{endpoint.path}</code>
          <TierBadge tier={endpoint.tier} />
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-slate-300 leading-relaxed">{endpoint.description}</p>
          </div>

          {/* Authentication */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Authentication</h4>
            <p className="text-slate-300 text-sm">
              Requires API key via <code className="text-cyan-400">X-API-Key</code> header or{' '}
              <code className="text-cyan-400">Authorization: Bearer snx_...</code> header.
              {endpoint.tier === 'Enterprise' && (
                <span className="text-purple-400 ml-1 font-medium">Enterprise API tier required.</span>
              )}
            </p>
          </div>

          {/* Parameters */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Parameters</h4>
            <ParameterTable parameters={endpoint.parameters} />
          </div>

          {/* Example Response */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Example Response</h4>
            <JsonBlock data={endpoint.exampleResponse} />
          </div>

          {/* Code Examples */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Code Examples</h4>
            <CodeExamples endpoint={endpoint} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Main Sidebar Navigation
// ============================================================

function Sidebar({
  activeSection,
  searchQuery,
  onSearchChange,
  onNavigate,
}: {
  activeSection: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: () => void;
}) {
  return (
    <nav className="space-y-1">
      {/* Search */}
      <div className="pb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search endpoints..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Overview links */}
      <a
        href="#overview"
        onClick={onNavigate}
        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
          activeSection === 'overview'
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        Overview
      </a>
      <a
        href="#authentication"
        onClick={onNavigate}
        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
          activeSection === 'authentication'
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        Authentication
      </a>
      <a
        href="#rate-limits"
        onClick={onNavigate}
        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
          activeSection === 'rate-limits'
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        Rate Limits
      </a>
      <a
        href="#errors"
        onClick={onNavigate}
        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
          activeSection === 'errors'
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        Error Codes
      </a>

      {/* Divider */}
      <div className="border-t border-slate-700 my-3" />
      <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Endpoints</p>

      {/* Endpoint categories */}
      {API_CATEGORIES.map((cat) => (
        <a
          key={cat.slug}
          href={`#category-${cat.slug}`}
          onClick={onNavigate}
          className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
            activeSection === `category-${cat.slug}`
              ? 'bg-cyan-500/10 text-cyan-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center justify-between">
            {cat.name}
            <span className="text-xs text-slate-600">{cat.endpoints.length}</span>
          </span>
        </a>
      ))}
    </nav>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function ApiDocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Filter endpoints based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return API_CATEGORIES;

    const q = searchQuery.toLowerCase();
    return API_CATEGORIES.map((cat) => ({
      ...cat,
      endpoints: cat.endpoints.filter(
        (ep) =>
          ep.summary.toLowerCase().includes(q) ||
          ep.description.toLowerCase().includes(q) ||
          ep.path.toLowerCase().includes(q) ||
          ep.tags.some((t) => t.toLowerCase().includes(q)) ||
          ep.parameters.some((p) => p.name.toLowerCase().includes(q))
      ),
    })).filter((cat) => cat.endpoints.length > 0);
  }, [searchQuery]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-section]');
      let currentSection = 'overview';

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 120) {
          currentSection = section.getAttribute('data-section') || 'overview';
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSidebarNavigate = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <Link href="/developer" className="text-slate-400 hover:text-white transition-colors text-sm">
              Developer Portal
            </Link>
            <span className="text-slate-600">/</span>
            <h1 className="text-lg font-bold text-white">API Documentation</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/developer/explorer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              API Explorer
            </Link>
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors"
            >
              OpenAPI Spec
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Sidebar - Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-[57px] left-0 z-20 h-[calc(100vh-57px)] w-72 bg-slate-950 border-r border-slate-800 overflow-y-auto p-4 transition-transform lg:transition-none lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            activeSection={activeSection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNavigate={handleSidebarNavigate}
          />
        </aside>

        {/* Main content */}
        <main ref={mainRef} className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 space-y-12">
          {/* Overview */}
          <section id="overview" data-section="overview" className="scroll-mt-24">
            <h2 className="text-3xl font-bold mb-4">SpaceNexus API v1</h2>
            <p className="text-slate-400 leading-relaxed max-w-3xl mb-6">
              The SpaceNexus API provides programmatic access to comprehensive space industry data.
              Build applications powered by real-time launch schedules, satellite tracking, company intelligence,
              market data, regulatory filings, and more. All endpoints return JSON and follow RESTful conventions.
            </p>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">Base URL:</span>{' '}
                <code className="text-cyan-400 font-mono">https://spacenexus.us/api/v1</code>
              </p>
            </div>

            {/* Quick Links */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {API_CATEGORIES.map((cat) => (
                <a
                  key={cat.slug}
                  href={`#category-${cat.slug}`}
                  className="block bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 hover:border-cyan-500/50 transition-colors group"
                >
                  <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{cat.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {cat.endpoints.map((ep) => (
                      <span key={ep.operationId} className="flex items-center gap-1">
                        <MethodBadge method={ep.method} />
                        <code className="text-xs text-slate-500">{ep.path}</code>
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" data-section="authentication" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Authentication</h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
              <p className="text-slate-300">
                All API requests must include a valid API key. You can pass it using either of these methods:
              </p>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400 mb-1.5">Option 1: X-API-Key Header (recommended)</p>
                  <div className="relative">
                    <pre className="bg-gray-800 rounded p-3 border border-slate-600">
                      <code className="text-green-400 text-sm">X-API-Key: snx_YOUR_API_KEY</code>
                    </pre>
                    <div className="absolute top-1.5 right-1.5">
                      <CopyButton text="X-API-Key: snx_YOUR_API_KEY" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1.5">Option 2: Bearer Token</p>
                  <div className="relative">
                    <pre className="bg-gray-800 rounded p-3 border border-slate-600">
                      <code className="text-green-400 text-sm">Authorization: Bearer snx_YOUR_API_KEY</code>
                    </pre>
                    <div className="absolute top-1.5 right-1.5">
                      <CopyButton text="Authorization: Bearer snx_YOUR_API_KEY" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                API keys use the prefix <code className="text-cyan-400">snx_</code> and can be generated from
                the{' '}
                <Link href="/developer" className="text-cyan-400 hover:text-cyan-300">
                  Developer Portal
                </Link>
                . Keys are hashed before storage and shown only once at creation time.
              </p>
            </div>
          </section>

          {/* Response Format */}
          <section data-section="authentication" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Response Format</h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
              <p className="text-slate-300">All responses follow a consistent JSON structure:</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-green-400 mb-2">Success (200)</p>
                  <JsonBlock
                    data={{
                      success: true,
                      data: ['...'],
                      pagination: { limit: 20, offset: 0, total: 150 },
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-400 mb-2">Error (4xx / 5xx)</p>
                  <JsonBlock
                    data={{
                      success: false,
                      error: {
                        code: 'RATE_LIMITED',
                        message: 'Per-minute rate limit exceeded.',
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" data-section="rate-limits" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
              <p className="text-slate-300">
                Rate limits are enforced per API key. Every response includes rate limit headers:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 pr-4 text-slate-400 font-medium">Header</th>
                      <th className="text-left py-2 text-slate-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-700/50">
                      <td className="py-2 pr-4"><code className="text-yellow-400">X-Request-Id</code></td>
                      <td className="py-2">Unique request identifier for debugging</td>
                    </tr>
                    <tr className="border-b border-slate-700/50">
                      <td className="py-2 pr-4"><code className="text-yellow-400">X-RateLimit-Limit</code></td>
                      <td className="py-2">Your per-minute rate limit</td>
                    </tr>
                    <tr className="border-b border-slate-700/50">
                      <td className="py-2 pr-4"><code className="text-yellow-400">X-RateLimit-Remaining</code></td>
                      <td className="py-2">Remaining calls in current window (on 429 responses)</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4"><code className="text-yellow-400">X-RateLimit-Reset</code></td>
                      <td className="py-2">Seconds until the rate limit resets (on 429 responses)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold mt-4 mb-2">Tier Limits</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 pr-4 text-slate-400 font-medium">Tier</th>
                      <th className="text-left py-2 pr-4 text-slate-400 font-medium">Monthly Limit</th>
                      <th className="text-left py-2 pr-4 text-slate-400 font-medium">Per-Minute Limit</th>
                      <th className="text-left py-2 pr-4 text-slate-400 font-medium">Max Keys</th>
                      <th className="text-left py-2 text-slate-400 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {RATE_LIMIT_TIERS.map((tier) => (
                      <tr key={tier.tier} className="border-b border-slate-700/50">
                        <td className="py-2 pr-4 font-medium text-white">{tier.tier}</td>
                        <td className="py-2 pr-4">{tier.monthlyLimit}</td>
                        <td className="py-2 pr-4">{tier.perMinuteLimit}</td>
                        <td className="py-2 pr-4">{tier.maxKeys}</td>
                        <td className="py-2 text-cyan-400">{tier.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Errors */}
          <section id="errors" data-section="errors" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Error Codes</h2>
            <div className="space-y-3">
              {COMMON_ERRORS.map((err) => (
                <div key={err.status} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                        err.status >= 500
                          ? 'bg-red-500/20 text-red-400'
                          : err.status === 429
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : err.status === 403
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {err.status}
                    </span>
                    <code className="text-white font-mono text-sm">{err.code}</code>
                  </div>
                  <p className="text-sm text-slate-300 mb-1">{err.description}</p>
                  <pre className="bg-gray-800 rounded p-2 text-xs border border-slate-600 overflow-x-auto">
                    <code className="text-slate-400">
                      {JSON.stringify({ success: false, error: { code: err.code, message: err.message } }, null, 2)}
                    </code>
                  </pre>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Endpoint Categories */}
          {filteredCategories.map((category) => (
            <section
              key={category.slug}
              id={`category-${category.slug}`}
              data-section={`category-${category.slug}`}
              className="scroll-mt-24"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{category.name}</h2>
                <p className="text-slate-400">{category.description}</p>
              </div>

              <div className="space-y-8">
                {category.endpoints.map((endpoint) => (
                  <EndpointSection key={endpoint.operationId} endpoint={endpoint} />
                ))}
              </div>
            </section>
          ))}

          {/* No results */}
          {filteredCategories.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No endpoints match &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-700 pt-8 pb-4 text-center">
            <p className="text-sm text-slate-500">
              Need help?{' '}
              <Link href="/contact" className="text-cyan-400 hover:text-cyan-300">
                Contact Support
              </Link>
              {' | '}
              <Link href="/developer" className="text-cyan-400 hover:text-cyan-300">
                Developer Portal
              </Link>
              {' | '}
              <Link href="/developer/explorer" className="text-cyan-400 hover:text-cyan-300">
                API Explorer
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
