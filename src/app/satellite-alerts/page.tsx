'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

interface SatelliteAlert {
  id: string;
  satellite: string;
  latitude: number;
  longitude: number;
  locationLabel: string | null;
  minElevation: number;
  enabled: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
}

interface NextPassData {
  satellite: string;
  passes: Array<{
    startTime: string;
    endTime: string;
    maxElevation: number;
    maxElevationAt: string;
    durationSeconds: number;
  }>;
}

function formatCoords(lat: number, lon: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(3)}°${ns}, ${Math.abs(lon).toFixed(3)}°${ew}`;
}

function formatPassTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SatelliteAlertsPage() {
  const { status } = useSession();
  const [alerts, setAlerts] = useState<SatelliteAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState<Record<string, NextPassData['passes']>>({});
  const [loadingPass, setLoadingPass] = useState<Record<string, boolean>>({});

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/satellite-alerts');
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.data || []);
      }
    } catch (err) {
      clientLogger.error('Failed to load satellite alerts', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadAlerts();
    else if (status === 'unauthenticated') setLoading(false);
  }, [status, loadAlerts]);

  const loadPass = useCallback(async (alert: SatelliteAlert) => {
    setLoadingPass((prev) => ({ ...prev, [alert.id]: true }));
    try {
      const params = new URLSearchParams({
        satellite: alert.satellite,
        lat: String(alert.latitude),
        lon: String(alert.longitude),
        hours: '48',
        minElevation: String(alert.minElevation),
      });
      const res = await fetch(`/api/satellite-alerts/next-pass?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPasses((prev) => ({ ...prev, [alert.id]: json.data.passes || [] }));
      }
    } catch (err) {
      clientLogger.error('Failed to load next pass', {
        alertId: alert.id,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingPass((prev) => ({ ...prev, [alert.id]: false }));
    }
  }, []);

  const toggleEnabled = async (alert: SatelliteAlert) => {
    try {
      const res = await fetch(`/api/satellite-alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !alert.enabled }),
      });
      if (res.ok) {
        toast.success(alert.enabled ? 'Alert paused' : 'Alert enabled');
        loadAlerts();
      } else {
        toast.error('Failed to update alert');
      }
    } catch {
      toast.error('Failed to update alert');
    }
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('Delete this satellite alert?')) return;
    try {
      const res = await fetch(`/api/satellite-alerts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Alert deleted');
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      } else {
        toast.error('Failed to delete alert');
      }
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl font-bold mb-4">Satellite Pass Alerts</h1>
          <p className="text-white/70 mb-8">
            Sign in to get notified when the ISS or other satellites pass over your location.
          </p>
          <Link
            href="/login?callbackUrl=/satellite-alerts"
            className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-12 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">Satellite Pass Alerts</h1>
            <p className="text-white/60 max-w-xl">
              Get notified before the ISS or any satellite becomes visible over your
              location. Predictions use live TLE data from CelesTrak.
            </p>
          </div>
          <Link
            href="/satellite-alerts/new"
            className="inline-block px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
          >
            + New alert
          </Link>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-white/50 text-sm">Loading…</div>
        ) : alerts.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/70 mb-4">No satellite alerts yet.</p>
            <p className="text-white/40 text-sm mb-6">
              Create one to be notified the next time the ISS (or any satellite you
              choose) passes over your location.
            </p>
            <Link
              href="/satellite-alerts/new"
              className="inline-block px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
            >
              Create first alert
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const alertPasses = passes[alert.id];
              const nextPass = alertPasses?.[0];
              return (
                <div
                  key={alert.id}
                  className="border border-white/10 rounded-xl p-5 bg-white/[0.02] hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-semibold">{alert.satellite}</h2>
                        {!alert.enabled && (
                          <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/20 rounded px-1.5 py-0.5">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/50">
                        {alert.locationLabel || formatCoords(alert.latitude, alert.longitude)}
                        <span className="mx-2">·</span>
                        min elevation {alert.minElevation}°
                      </p>
                      {alert.lastNotifiedAt && (
                        <p className="text-xs text-white/30 mt-1">
                          Last notified {formatPassTime(alert.lastNotifiedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadPass(alert)}
                        disabled={loadingPass[alert.id]}
                        className="text-xs px-3 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
                      >
                        {loadingPass[alert.id] ? 'Checking…' : 'Check passes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleEnabled(alert)}
                        className="text-xs px-3 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 transition"
                      >
                        {alert.enabled ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAlert(alert.id)}
                        className="text-xs px-3 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 hover:border-white/40 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Upcoming passes */}
                  {alertPasses && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      {alertPasses.length === 0 ? (
                        <p className="text-xs text-white/50">
                          No passes above {alert.minElevation}° in the next 48 hours.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {alertPasses.slice(0, 4).map((pass, i) => (
                            <div
                              key={`${alert.id}-${i}`}
                              className="flex items-center justify-between text-xs text-white/70"
                            >
                              <span>
                                {i === 0 && nextPass ? 'Next: ' : ''}
                                {formatPassTime(pass.startTime)} → {formatPassTime(pass.endTime)}
                              </span>
                              <span className="text-white/50">
                                peak {pass.maxElevation}° · {Math.round(pass.durationSeconds / 60)} min
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
