'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';

// Folded into the /alerts hub from the former standalone /satellite-alerts and
// /satellite-alerts/new pages. Backend/API (`/api/satellite-alerts*`) is unchanged.

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

const SATELLITE_PRESETS = [
  { value: 'ISS', label: 'International Space Station (ISS)' },
  { value: 'CSS', label: 'Tiangong (China Space Station)' },
  { value: 'HST', label: 'Hubble Space Telescope' },
];

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

export default function SatellitePassesTab() {
  const [alerts, setAlerts] = useState<SatelliteAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState<Record<string, NextPassData['passes']>>({});
  const [loadingPass, setLoadingPass] = useState<Record<string, boolean>>({});

  // Inline "new alert" form state
  const [showForm, setShowForm] = useState(false);
  const [satellite, setSatellite] = useState('ISS');
  const [customSat, setCustomSat] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [minElevation, setMinElevation] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

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
    loadAlerts();
  }, [loadAlerts]);

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

  const useMyLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not available in this browser');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
        toast.success('Location captured');
      },
      (err) => {
        setGeoLoading(false);
        clientLogger.warn('Geolocation failed', { error: err.message });
        toast.error('Could not get your location. Enter coordinates manually.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
    );
  };

  const resetForm = () => {
    setSatellite('ISS');
    setCustomSat('');
    setLocationLabel('');
    setLatitude('');
    setLongitude('');
    setMinElevation(10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const effectiveSat = satellite === 'custom' ? customSat.trim() : satellite;
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (!effectiveSat) {
      toast.error('Satellite is required');
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      toast.error('Latitude must be between -90 and 90');
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) {
      toast.error('Longitude must be between -180 and 180');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/satellite-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satellite: effectiveSat,
          latitude: latNum,
          longitude: lonNum,
          locationLabel: locationLabel.trim() || undefined,
          minElevation,
          enabled: true,
        }),
      });

      if (res.ok) {
        toast.success('Alert created');
        resetForm();
        setShowForm(false);
        loadAlerts();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error?.message || 'Failed to create alert';
        toast.error(msg);
      }
    } catch (err) {
      clientLogger.error('Failed to create satellite alert', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-slate-400 max-w-xl">
          Get notified before the ISS or any satellite becomes visible over your location.
          Predictions use live TLE data from CelesTrak.
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? 'Cancel' : 'New alert'}
        </button>
      </div>

      {/* Inline "new alert" form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 bg-black/80 border border-white/[0.08] rounded-xl p-5 space-y-5"
        >
          {/* Satellite */}
          <div>
            <label htmlFor="sat-tab-satellite" className="block text-sm font-medium text-white mb-2">
              Satellite
            </label>
            <select
              id="sat-tab-satellite"
              value={satellite}
              onChange={(e) => setSatellite(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {SATELLITE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Other (enter NORAD catalog ID)</option>
            </select>
            {satellite === 'custom' && (
              <input
                type="text"
                value={customSat}
                onChange={(e) => setCustomSat(e.target.value)}
                placeholder="e.g. 25544"
                className="mt-3 w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            )}
            <p className="mt-2 text-xs text-slate-500">
              ISS predictions are fully supported. Other NORAD IDs depend on CelesTrak TLE availability.
            </p>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="sat-tab-location" className="block text-sm font-medium text-white">
                Location
              </label>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={geoLoading}
                className="text-xs px-3 py-1.5 border border-white/[0.08] rounded-lg hover:bg-white/10 transition disabled:opacity-50"
              >
                {geoLoading ? 'Locating…' : 'Use my location'}
              </button>
            </div>
            <input
              id="sat-tab-location"
              type="text"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="Label (optional) — e.g. London, Austin"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Latitude"
                required
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Longitude"
                required
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
          </div>

          {/* Min elevation */}
          <div>
            <label htmlFor="sat-tab-elevation" className="block text-sm font-medium text-white mb-2">
              Minimum elevation
              <span className="ml-2 text-slate-400 font-normal">{minElevation}° above horizon</span>
            </label>
            <input
              id="sat-tab-elevation"
              type="range"
              min={0}
              max={85}
              step={5}
              value={minElevation}
              onChange={(e) => setMinElevation(parseInt(e.target.value, 10))}
              className="w-full accent-white"
            />
            <p className="mt-2 text-xs text-slate-500">
              Higher values reduce noise (only high, clearly visible passes). 10° is a good default for casual
              spotting.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create alert'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-6 py-2.5 border border-white/[0.08] rounded-lg hover:bg-white/10 transition text-white/70"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 bg-black/50 border border-white/[0.06] rounded-xl">
          <p className="text-white/70 mb-2">No satellite alerts yet.</p>
          <p className="text-slate-500 text-sm mb-6">
            Create one to be notified the next time the ISS (or any satellite you choose) passes over your
            location.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-block px-5 py-2.5 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition"
          >
            Create first alert
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const alertPasses = passes[alert.id];
            const nextPass = alertPasses?.[0];
            return (
              <div
                key={alert.id}
                className="border border-white/[0.08] rounded-xl p-5 bg-black/80 hover:border-white/[0.1] transition"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{alert.satellite}</h3>
                      {!alert.enabled && (
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 border border-white/20 rounded px-1.5 py-0.5">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {alert.locationLabel || formatCoords(alert.latitude, alert.longitude)}
                      <span className="mx-2">·</span>
                      min elevation {alert.minElevation}°
                    </p>
                    {alert.lastNotifiedAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        Last notified {formatPassTime(alert.lastNotifiedAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadPass(alert)}
                      disabled={loadingPass[alert.id]}
                      className="text-xs px-3 py-1.5 border border-white/[0.08] rounded-lg hover:bg-white/10 transition disabled:opacity-50"
                    >
                      {loadingPass[alert.id] ? 'Checking…' : 'Check passes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(alert)}
                      className="text-xs px-3 py-1.5 border border-white/[0.08] rounded-lg hover:bg-white/10 transition"
                    >
                      {alert.enabled ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAlert(alert.id)}
                      className="text-xs px-3 py-1.5 border border-white/[0.08] rounded-lg hover:bg-white/10 hover:border-white/40 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Upcoming passes */}
                {alertPasses && (
                  <div className="mt-4 pt-4 border-t border-white/[0.08]">
                    {alertPasses.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No passes above {alert.minElevation}° in the next 48 hours.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {alertPasses.slice(0, 4).map((pass, i) => (
                          <div
                            key={`${alert.id}-${i}`}
                            className="flex items-center justify-between text-xs text-slate-300"
                          >
                            <span>
                              {i === 0 && nextPass ? 'Next: ' : ''}
                              {formatPassTime(pass.startTime)} → {formatPassTime(pass.endTime)}
                            </span>
                            <span className="text-slate-500">
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
  );
}
