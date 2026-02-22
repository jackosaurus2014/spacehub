'use client';

import { useState, useEffect } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from '@/lib/toast';

interface ProfileForm {
  headline: string;
  bio: string;
  expertise: string;
  location: string;
  linkedinUrl: string;
  isPublic: boolean;
}

export default function EditProfilePage() {
  const [form, setForm] = useState<ProfileForm>({
    headline: '',
    bio: '',
    expertise: '',
    location: '',
    linkedinUrl: '',
    isPublic: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/community/profiles?self=true');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setHasProfile(true);
            setForm({
              headline: data.profile.headline || '',
              bio: data.profile.bio || '',
              expertise: (data.profile.expertise || []).join(', '),
              location: data.profile.location || '',
              linkedinUrl: data.profile.linkedinUrl || '',
              isPublic: data.profile.isPublic ?? true,
            });
          }
        }
      } catch {
        // leave defaults
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const expertiseArray = form.expertise
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/community/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: form.headline || null,
          bio: form.bio || null,
          expertise: expertiseArray,
          location: form.location || null,
          linkedinUrl: form.linkedinUrl || null,
          isPublic: form.isPublic,
        }),
      });

      if (res.ok) {
        setHasProfile(true);
        toast.success(hasProfile ? 'Profile updated successfully' : 'Profile created successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save profile');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title={hasProfile ? 'Edit Your Profile' : 'Create Your Profile'}
          subtitle="Set up your professional profile to be discoverable in the community directory."
          icon={<span>{"👤"}</span>}
          breadcrumb="Community"
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Headline */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Professional Info</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Headline</label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                  placeholder="e.g., Propulsion Engineer at SpaceX"
                  maxLength={150}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                />
                <p className="text-xs text-slate-500 mt-1">A short tagline for your profile card</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell the community about your experience and interests in the space industry..."
                  rows={5}
                  maxLength={1000}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">{form.bio.length}/1000 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Expertise</label>
                <input
                  type="text"
                  value={form.expertise}
                  onChange={(e) => setForm((f) => ({ ...f, expertise: e.target.value }))}
                  placeholder="e.g., Propulsion Engineering, Mission Operations, RF Systems"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                />
                <p className="text-xs text-slate-500 mt-1">Comma-separated list of your areas of expertise</p>
              </div>
            </div>
          </div>

          {/* Location & Links */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Location & Links</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g., Los Angeles, CA"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourname"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Privacy</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Public Profile</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  When enabled, your profile appears in the professional directory
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600" />
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                hasProfile ? 'Update Profile' : 'Create Profile'
              )}
            </button>
            {hasProfile && (
              <a
                href="/community/directory"
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition-colors"
              >
                View in Directory
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
