'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import {
  API_CATEGORIES,
  ALL_ENDPOINTS,
  type OpenAPIEndpoint,
  type EndpointParameter,
} from '@/lib/openapi-spec';

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY_API_KEY = 'spacenexus-explorer-api-key';
const STORAGE_KEY_HISTORY = 'spacenexus-explorer-history';
const MAX_HISTORY = 10;
const BASE_URL_OPTIONS = [
  { label: 'Production', value: 'https://spacenexus.us/api/v1' },
  { label: 'Local', value: 'http://localhost:3000/api/v1' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  DELETE: 'text-red-400',
};

// ============================================================
// Types
// ============================================================

interface RequestHistoryItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number | null;
  responseTime: number;
  endpointName: string;
}

interface ResponseData {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
}

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

function StatusBadge({ code }: { code: number | null }) {
  if (code === null) return null;

  let color = 'bg-gray-500/20 text-gray-400';
  if (code >= 200 && code < 300) color = 'bg-green-500/20 text-green-400';
  else if (code >= 300 && code < 400) color = 'bg-blue-500/20 text-blue-400';
  else if (code >= 400 && code < 500) color = 'bg-yellow-500/20 text-yellow-400';
  else if (code >= 500) color = 'bg-red-500/20 text-red-400';

  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${color}`}>
      {code}
    </span>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function ApiExplorerPage() {
  // State
  const [selectedEndpoint, setSelectedEndpoint] = useState<OpenAPIEndpoint>(ALL_ENDPOINTS[0]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(BASE_URL_OPTIONS[0].value);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeResponseTab, setActiveResponseTab] = useState<'body' | 'headers'>('body');

  // Load persisted state
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY);
      if (savedKey) setApiKey(savedKey);

      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch {
      // Storage unavailable
    }
  }, []);

  // Persist API key
  useEffect(() => {
    try {
      if (apiKey) {
        localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
      }
    } catch {
      // Storage unavailable
    }
  }, [apiKey]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {
      // Storage unavailable
    }
  }, [history]);

  // Reset param values when endpoint changes
  useEffect(() => {
    const defaults: Record<string, string> = {};
    selectedEndpoint.parameters.forEach((p) => {
      if (p.default !== undefined) {
        defaults[p.name] = String(p.default);
      }
    });
    setParamValues(defaults);
    setResponse(null);
  }, [selectedEndpoint]);

  // Build the full request URL
  const requestUrl = useMemo(() => {
    let url = `${baseUrl}${selectedEndpoint.path}`;
    const queryParts: string[] = [];

    selectedEndpoint.parameters.forEach((param) => {
      const value = paramValues[param.name];
      if (value && value.trim()) {
        if (param.in === 'query') {
          queryParts.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(value.trim())}`);
        }
      }
    });

    if (queryParts.length > 0) {
      url += '?' + queryParts.join('&');
    }

    return url;
  }, [baseUrl, selectedEndpoint, paramValues]);

  // Send request
  const handleSendRequest = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    setLoading(true);
    setResponse(null);
    setActiveResponseTab('body');

    const startTime = performance.now();

    try {
      const res = await fetch(requestUrl, {
        method: selectedEndpoint.method,
        headers: {
          'X-API-Key': apiKey.trim(),
          'Accept': 'application/json',
        },
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Gather response headers
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      let bodyText: string;
      try {
        const json = await res.json();
        bodyText = JSON.stringify(json, null, 2);
      } catch {
        bodyText = await res.text();
      }

      const responseData: ResponseData = {
        statusCode: res.status,
        statusText: res.statusText,
        headers,
        body: bodyText,
        responseTime,
      };

      setResponse(responseData);

      // Add to history
      const historyItem: RequestHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        method: selectedEndpoint.method,
        url: requestUrl,
        statusCode: res.status,
        responseTime,
        endpointName: selectedEndpoint.summary,
      };

      setHistory((prev) => [historyItem, ...prev].slice(0, MAX_HISTORY));
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      setResponse({
        statusCode: 0,
        statusText: 'Network Error',
        headers: {},
        body: JSON.stringify(
          {
            error: 'Failed to connect to the API.',
            details: error instanceof Error ? error.message : String(error),
            hint: 'If using the Production URL, ensure your API key is valid. If using Local, ensure the dev server is running.',
          },
          null,
          2
        ),
        responseTime,
      });
    } finally {
      setLoading(false);
    }
  }, [apiKey, requestUrl, selectedEndpoint]);

  // Clear history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    toast.success('Request history cleared');
  }, []);

  // Replay a history item
  const handleReplayHistory = useCallback(
    (item: RequestHistoryItem) => {
      const ep = ALL_ENDPOINTS.find((e) => `${baseUrl}${e.path}` === item.url.split('?')[0]);
      if (ep) {
        setSelectedEndpoint(ep);
        // Parse query params from URL
        try {
          const url = new URL(item.url);
          const newParams: Record<string, string> = {};
          url.searchParams.forEach((value, key) => {
            newParams[key] = value;
          });
          setParamValues(newParams);
        } catch {
          // Ignore URL parse errors
        }
      }
    },
    [baseUrl]
  );

  // Grouped endpoints for the dropdown
  const endpointOptions = useMemo(() => {
    return API_CATEGORIES.map((cat) => ({
      label: cat.name,
      endpoints: cat.endpoints,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/developer" className="text-slate-400 hover:text-white transition-colors text-sm">
              Developer Portal
            </Link>
            <span className="text-slate-600">/</span>
            <h1 className="text-lg font-bold text-white">API Explorer</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/developer/docs"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Docs
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* ========== Left Panel: Request Builder ========== */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Request</h2>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 space-y-5">
              {/* Base URL + Endpoint selection */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Server</label>
                <select
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {BASE_URL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} -- {opt.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Endpoint</label>
                <select
                  value={selectedEndpoint.operationId}
                  onChange={(e) => {
                    const ep = ALL_ENDPOINTS.find((ep) => ep.operationId === e.target.value);
                    if (ep) setSelectedEndpoint(ep);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {endpointOptions.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.endpoints.map((ep) => (
                        <option key={ep.operationId} value={ep.operationId}>
                          {ep.method} {ep.path} -- {ep.summary}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Full URL display */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Request URL</label>
                <div className="relative">
                  <div className="flex items-center gap-2 bg-gray-800 border border-slate-600 rounded-lg px-3 py-2 overflow-x-auto">
                    <span className={`text-sm font-bold font-mono flex-shrink-0 ${METHOD_COLORS[selectedEndpoint.method] || 'text-white'}`}>
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-sm text-slate-300 font-mono whitespace-nowrap">{requestUrl}</code>
                  </div>
                  <div className="absolute top-1.5 right-1.5">
                    <CopyButton text={requestUrl} />
                  </div>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  API Key
                  <span className="text-slate-600 font-normal ml-1">(stored in localStorage)</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="snx_YOUR_API_KEY"
                    className="w-full px-3 py-2 pr-20 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-yellow-500/70 mt-1.5">
                  Warning: Your API key is stored in the browser&apos;s localStorage for convenience. Do not use production keys on shared computers.
                </p>
              </div>

              {/* Parameters */}
              {selectedEndpoint.parameters.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Parameters</label>
                  <div className="space-y-3">
                    {selectedEndpoint.parameters.map((param) => (
                      <div key={param.name}>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs text-cyan-400 font-mono">{param.name}</code>
                          <span className="text-xs text-slate-500">{param.type}</span>
                          {param.required && (
                            <span className="text-xs text-red-400">required</span>
                          )}
                        </div>
                        {param.enum ? (
                          <select
                            value={paramValues[param.name] || ''}
                            onChange={(e) =>
                              setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))
                            }
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="">-- any --</option>
                            {param.enum.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={paramValues[param.name] || ''}
                            onChange={(e) =>
                              setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))
                            }
                            placeholder={param.description}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSendRequest}
                disabled={loading || !apiKey.trim()}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Send Request
                  </>
                )}
              </button>
            </div>

            {/* Request History */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-400">
                  Request History
                  {history.length > 0 && (
                    <span className="text-slate-600 ml-1">({history.length})</span>
                  )}
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="text-sm text-slate-600 italic">No requests yet. Send a request to see history here.</p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleReplayHistory(item)}
                      className="w-full text-left px-3 py-2 bg-slate-800/30 border border-slate-700/50 rounded-lg hover:border-cyan-500/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-bold font-mono ${METHOD_COLORS[item.method] || 'text-white'}`}>
                          {item.method}
                        </span>
                        <StatusBadge code={item.statusCode} />
                        <span className="text-slate-500 flex-1 truncate font-mono">
                          {item.url.replace(baseUrl, '')}
                        </span>
                        <span className="text-slate-600">{item.responseTime}ms</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-slate-500 truncate">{item.endpointName}</span>
                        <span className="text-xs text-slate-600">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ========== Right Panel: Response ========== */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Response</h2>

            {!response && !loading ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-slate-600 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <p className="text-slate-500">Select an endpoint, enter your API key, and click Send Request.</p>
                <p className="text-sm text-slate-600 mt-2">
                  Need an API key?{' '}
                  <Link href="/developer" className="text-cyan-400 hover:text-cyan-300">
                    Get one from the Developer Portal
                  </Link>
                </p>
              </div>
            ) : loading ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
                <svg className="animate-spin w-8 h-8 mx-auto text-cyan-400 mb-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-slate-400">Sending request...</p>
              </div>
            ) : response ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                {/* Response status bar */}
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusBadge code={response.statusCode} />
                    <span className="text-sm text-slate-300">
                      {response.statusCode === 0 ? 'Network Error' : response.statusText}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">{response.responseTime}ms</span>
                </div>

                {/* Response tabs */}
                <div className="flex border-b border-slate-700">
                  <button
                    onClick={() => setActiveResponseTab('body')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeResponseTab === 'body'
                        ? 'text-cyan-400 border-cyan-400'
                        : 'text-slate-400 border-transparent hover:text-slate-300'
                    }`}
                  >
                    Body
                  </button>
                  <button
                    onClick={() => setActiveResponseTab('headers')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeResponseTab === 'headers'
                        ? 'text-cyan-400 border-cyan-400'
                        : 'text-slate-400 border-transparent hover:text-slate-300'
                    }`}
                  >
                    Headers
                    <span className="text-xs text-slate-600 ml-1">
                      ({Object.keys(response.headers).length})
                    </span>
                  </button>
                </div>

                {/* Response body */}
                {activeResponseTab === 'body' && (
                  <div className="relative">
                    <pre className="p-4 text-sm overflow-auto max-h-[600px] bg-gray-800">
                      <code
                        className={`whitespace-pre ${
                          response.statusCode >= 200 && response.statusCode < 300
                            ? 'text-green-400'
                            : response.statusCode === 0
                              ? 'text-red-400'
                              : 'text-yellow-400'
                        }`}
                      >
                        {response.body}
                      </code>
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={response.body} />
                    </div>
                  </div>
                )}

                {/* Response headers */}
                {activeResponseTab === 'headers' && (
                  <div className="p-4 overflow-auto max-h-[600px]">
                    {Object.keys(response.headers).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No headers available.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {Object.entries(response.headers).map(([key, value]) => (
                            <tr key={key} className="border-b border-slate-700/50">
                              <td className="py-1.5 pr-4 text-cyan-400 font-mono whitespace-nowrap">
                                {key}
                              </td>
                              <td className="py-1.5 text-slate-300 font-mono break-all">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* cURL equivalent */}
            {apiKey && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2">cURL Equivalent</h3>
                <div className="relative">
                  <pre className="bg-gray-800 rounded-lg p-3 text-xs overflow-x-auto border border-slate-600">
                    <code className="text-green-400 whitespace-pre">
                      {`curl -X ${selectedEndpoint.method} "${requestUrl}" \\\n  -H "X-API-Key: ${showApiKey ? apiKey : 'snx_****'}"${selectedEndpoint.method !== 'GET' ? ' \\\n  -H "Content-Type: application/json"' : ''}`}
                    </code>
                  </pre>
                  <div className="absolute top-1.5 right-1.5">
                    <CopyButton
                      text={`curl -X ${selectedEndpoint.method} "${requestUrl}" \\\n  -H "X-API-Key: ${apiKey}"${selectedEndpoint.method !== 'GET' ? ' \\\n  -H "Content-Type: application/json"' : ''}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
