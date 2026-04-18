'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const BUILD_TRACKS = [
  { value: 'diy-satellite', label: 'DIY Satellite' },
  { value: 'cansat', label: 'CanSat' },
  { value: 'high-altitude-balloon', label: 'High-Altitude Balloon' },
  { value: 'weather-station', label: 'Weather Station' },
  { value: 'amateur-radio', label: 'Amateur Radio' },
];

interface MaterialDraft {
  name: string;
  qty: string;
  url: string;
  notes: string;
}

interface StepDraft {
  title: string;
  body: string;
  imageUrl: string;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

export default function NewBuildGuidePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [track, setTrack] = useState('cansat');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [materials, setMaterials] = useState<MaterialDraft[]>([
    { name: '', qty: '', url: '', notes: '' },
  ]);
  const [steps, setSteps] = useState<StepDraft[]>([{ title: '', body: '', imageUrl: '' }]);
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/build-guides/new');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/60">
        Loading...
      </div>
    );
  }
  if (!session) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        slug: slug || slugify(title),
        title,
        description,
        track,
        difficulty,
        estimatedHours: estimatedHours ? parseInt(estimatedHours, 10) : undefined,
        materialsList: materials
          .filter((m) => m.name.trim())
          .map((m) => ({
            name: m.name.trim(),
            qty: m.qty.trim() || undefined,
            url: m.url.trim() || undefined,
            notes: m.notes.trim() || undefined,
          })),
        steps: steps
          .filter((s) => s.title.trim() && s.body.trim())
          .map((s) => ({
            title: s.title.trim(),
            body: s.body.trim(),
            imageUrl: s.imageUrl.trim() || undefined,
          })),
        published,
      };
      const res = await fetch('/api/build-guides', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          (data && data.error && (data.error.message || data.error)) ||
          (data && data.message) ||
          'Failed to create guide';
        throw new Error(typeof msg === 'string' ? msg : 'Failed to create guide');
      }
      const createdSlug =
        (data.data && data.data.slug) || data.slug || payload.slug;
      router.push(`/build-guides/${createdSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span>/</span>
          <Link href="/build-guides" className="hover:text-white/80">
            Build Guides
          </Link>
          <span>/</span>
          <span className="text-slate-400">New</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">Contribute a Build Guide</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              className="w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Slug</label>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Track</label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white focus:outline-none focus:border-sky-400"
              >
                {BUILD_TRACKS.map((t) => (
                  <option key={t.value} value={t.value} className="bg-slate-900">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white focus:outline-none focus:border-sky-400"
              >
                <option value="beginner" className="bg-slate-900">
                  Beginner
                </option>
                <option value="intermediate" className="bg-slate-900">
                  Intermediate
                </option>
                <option value="advanced" className="bg-slate-900">
                  Advanced
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Est. hours</label>
              <input
                type="number"
                min={1}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Materials</h2>
            <div className="space-y-3">
              {materials.map((m, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      placeholder="Item name"
                      value={m.name}
                      onChange={(e) =>
                        setMaterials((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      className="rounded border border-white/15 bg-white/[0.05] px-2 py-1.5 text-sm text-white"
                    />
                    <input
                      placeholder="Qty (e.g. 1 or 4x)"
                      value={m.qty}
                      onChange={(e) =>
                        setMaterials((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)),
                        )
                      }
                      className="rounded border border-white/15 bg-white/[0.05] px-2 py-1.5 text-sm text-white"
                    />
                  </div>
                  <input
                    placeholder="Product URL (optional)"
                    value={m.url}
                    onChange={(e) =>
                      setMaterials((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                      )
                    }
                    className="w-full rounded border border-white/15 bg-white/[0.05] px-2 py-1.5 text-sm text-white"
                  />
                  <input
                    placeholder="Notes (optional)"
                    value={m.notes}
                    onChange={(e) =>
                      setMaterials((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)),
                      )
                    }
                    className="w-full rounded border border-white/15 bg-white/[0.05] px-2 py-1.5 text-sm text-white"
                  />
                  {materials.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMaterials((arr) => arr.filter((_, j) => j !== i))
                      }
                      className="text-xs text-red-300 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setMaterials((arr) => [...arr, { name: '', qty: '', url: '', notes: '' }])
                }
                className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm text-white hover:bg-white/[0.08]"
              >
                + Add material
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Steps</h2>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2"
                >
                  <div className="text-xs text-white/50">Step {i + 1}</div>
                  <input
                    placeholder="Step title"
                    value={s.title}
                    onChange={(e) =>
                      setSteps((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                      )
                    }
                    className="w-full rounded border border-white/15 bg-white/[0.05] px-2 py-1.5 text-sm text-white"
                  />
                  <textarea
                    placeholder="Step body (supports markdown)"
                    rows={4}
                    value={s.body}
                    onChange={(e) =>
                      setSteps((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)),
                      )
                    }
                    className="w-full rounded border border-white/15 bg-white/[0.05] px-2 py-1.5 text-sm text-white font-mono"
                  />
                  <input
                    placeholder="Image URL (optional)"
                    value={s.imageUrl}
                    onChange={(e) =>
                      setSteps((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, imageUrl: e.target.value } : x)),
                      )
                    }
                    className="w-full rounded border border-white/15 bg-white/[0.05] px-2 py-1.5 text-sm text-white"
                  />
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSteps((arr) => arr.filter((_, j) => j !== i))}
                      className="text-xs text-red-300 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSteps((arr) => [...arr, { title: '', body: '', imageUrl: '' }])
                }
                className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm text-white hover:bg-white/[0.08]"
              >
                + Add step
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="accent-sky-400"
            />
            Publish immediately
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create guide'}
            </button>
            <Link
              href="/build-guides"
              className="rounded-lg border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm text-white hover:bg-white/[0.08]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
