'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

const SATELLITE_PRESETS = [
  { value: 'ISS', label: 'International Space Station (ISS)' },
  { value: 'CSS', label: 'Tiangong (China Space Station)' },
  { value: 'HST', label: 'Hubble Space Telescope' },
];

export default function NewSatelliteAlertPage() {
  const router = useRouter();
  const { status } = useSession();
  const [satellite, setSatellite] = useState('ISS');
  const [customSat, setCustomSat] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [minElevation, setMinElevation] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

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
        router.push('/satellite-alerts');
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

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Sign in to create alerts</h1>
          <Link
            href="/login?callbackUrl=/satellite-alerts/new"
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
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/satellite-alerts"
          className="text-sm text-white/50 hover:text-white/80 transition"
        >
          ← Back to alerts
        </Link>

        <h1 className="text-3xl font-bold mt-4 mb-8 tracking-tight">
          New Satellite Pass Alert
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Satellite */}
          <div>
            <label
              htmlFor="satellite"
              className="block text-sm font-medium mb-2"
            >
              Satellite
            </label>
            <select
              id="satellite"
              value={satellite}
              onChange={(e) => setSatellite(e.target.value)}
              className="w-full bg-black border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/50 transition"
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
                className="mt-3 w-full bg-black border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition"
              />
            )}
            <p className="mt-2 text-xs text-white/40">
              ISS predictions are fully supported. Other NORAD IDs depend on
              CelesTrak TLE availability.
            </p>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="locationLabel" className="block text-sm font-medium">
                Location
              </label>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={geoLoading}
                className="text-xs px-3 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
              >
                {geoLoading ? 'Locating…' : 'Use my location'}
              </button>
            </div>
            <input
              id="locationLabel"
              type="text"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="Label (optional) — e.g. London, Austin"
              className="w-full bg-black border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition"
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
                className="bg-black border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition"
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
                className="bg-black border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition"
              />
            </div>
          </div>

          {/* Min elevation */}
          <div>
            <label htmlFor="minElevation" className="block text-sm font-medium mb-2">
              Minimum elevation
              <span className="ml-2 text-white/50 font-normal">
                {minElevation}° above horizon
              </span>
            </label>
            <input
              id="minElevation"
              type="range"
              min={0}
              max={85}
              step={5}
              value={minElevation}
              onChange={(e) => setMinElevation(parseInt(e.target.value, 10))}
              className="w-full accent-white"
            />
            <p className="mt-2 text-xs text-white/40">
              Higher values reduce noise (only high, clearly visible passes). 10°
              is a good default for casual spotting.
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create alert'}
            </button>
            <Link
              href="/satellite-alerts"
              className="px-6 py-3 border border-white/20 rounded-lg hover:bg-white/10 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
