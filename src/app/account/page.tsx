'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal from '@/components/ui/ScrollReveal';

type Section = 'profile' | 'security' | 'notifications' | 'appearance' | 'data-privacy';

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  subscriptionTier: string | null;
}

interface NotificationPreferences {
  emailDigest: boolean;
  emailAlerts: boolean;
  pushEnabled: boolean;
  forumReplies: boolean;
  directMessages: boolean;
  marketplaceUpdates: boolean;
  watchlistAlerts: boolean;
  newsDigest: boolean;
  digestFrequency: string;
}

const SECTION_TABS: { key: Section; label: string; icon: string }[] = [
  { key: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { key: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { key: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { key: 'appearance', label: 'Appearance', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
  { key: 'data-privacy', label: 'Data & Privacy', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

const NOTIFICATION_TOGGLES: { key: keyof Omit<NotificationPreferences, 'digestFrequency'>; label: string; description: string }[] = [
  { key: 'emailDigest', label: 'Email Digest', description: 'Periodic summary of activity and updates' },
  { key: 'emailAlerts', label: 'Email Alerts', description: 'Immediate email for important events' },
  { key: 'pushEnabled', label: 'Push Notifications', description: 'Browser push notifications for real-time updates' },
  { key: 'forumReplies', label: 'Forum Replies', description: 'Notifications when someone replies to your threads' },
  { key: 'directMessages', label: 'Direct Messages', description: 'Notifications for new direct messages' },
  { key: 'marketplaceUpdates', label: 'Marketplace Updates', description: 'Updates on RFQs, proposals, and listings' },
  { key: 'watchlistAlerts', label: 'Watchlist Alerts', description: 'Alerts for companies and topics you follow' },
  { key: 'newsDigest', label: 'News Digest', description: 'Curated space industry news summaries' },
];

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <ScrollReveal>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
            <p className="text-slate-400">
              Manage your SpaceNexus account, security, and preferences
            </p>
          </div>
        </ScrollReveal>

        {/* Tab Navigation */}
        <ScrollReveal delay={0.1}>
          <div className="relative">
            <div className="flex overflow-x-auto border-b border-slate-800 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              {SECTION_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className={`flex items-center gap-2 py-3 px-4 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    activeSection === tab.key
                      ? 'border-white/15 text-white'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none sm:hidden" />
          </div>
        </ScrollReveal>

        {/* Section Content */}
        <ScrollReveal delay={0.2}>
          {activeSection === 'profile' && <ProfileSection session={session} />}
          {activeSection === 'security' && <SecuritySection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'data-privacy' && <DataPrivacySection />}
        </ScrollReveal>

        {/* Quick Links */}
        <ScrollReveal delay={0.3}>
        <section className="mt-8 bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/privacy"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/faq"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              FAQ & Support
            </Link>
          </div>
        </section>
        </ScrollReveal>
      </div>
    </div>
  );
}

/* ================================================================
   Section 1: Profile
   ================================================================ */

function ProfileSection({ session }: { session: any }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/account/profile');
      if (res.ok) {
        const json = await res.json();
        setProfile(json.data);
        setEditName(json.data.name || '');
      }
    } catch {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || 'Failed to update name');
        return;
      }

      setProfile(json.data);
      setEditName(json.data.name || '');
      setIsEditing(false);
      toast.success('Name updated successfully');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };

  const tierLabels: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  const tierColors: Record<string, string> = {
    free: 'bg-slate-700 text-slate-300',
    pro: 'bg-slate-800/50 text-slate-200 border border-white/10',
    enterprise: 'bg-purple-900/50 text-purple-300 border border-purple-700/50',
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-slate-700 rounded w-32" />
          <div className="h-10 bg-slate-700 rounded w-full" />
          <div className="h-10 bg-slate-700 rounded w-full" />
          <div className="h-10 bg-slate-700 rounded w-48" />
        </div>
      </div>
    );
  }

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-6">Profile Information</h2>

      <div className="space-y-5">
        {/* Name Field */}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Display Name</label>
          {isEditing ? (
            <div className="flex gap-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoComplete="name"
                enterKeyHint="done"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                placeholder="Your name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditName(profile?.name || '');
                  }
                }}
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName}
                className="px-4 py-2 bg-white hover:bg-slate-600 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isSavingName ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(profile?.name || '');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-white">{profile?.name || 'Not set'}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Email (Read-Only) */}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Email Address</label>
          <div className="flex items-center gap-2">
            <p className="text-white">{profile?.email || session.user?.email}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
              Read-only
            </span>
          </div>
        </div>

        {/* Member Since */}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Member Since</label>
          <p className="text-white">
            {profile?.createdAt
              ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                })
              : 'Unknown'}
          </p>
        </div>

        {/* Subscription Tier */}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Subscription Tier</label>
          <span
            className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${
              tierColors[profile?.subscriptionTier || 'free'] || tierColors.free
            }`}
          >
            {tierLabels[profile?.subscriptionTier || 'free'] || 'Free'}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Section 2: Security
   ================================================================ */

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || 'Failed to change password');
        return;
      }

      // Clear form on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      toast.success('Password changed successfully');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-2">Security</h2>
      <p className="text-sm text-slate-400 mb-6">
        Update your password to keep your account secure
      </p>

      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
        {/* Current Password */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
              placeholder="Enter current password"
              autoComplete="current-password"
              enterKeyHint="next"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {showCurrent ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
              placeholder="Enter new password"
              autoComplete="new-password"
              enterKeyHint="next"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {showNew ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {newPassword && newPassword.length < 8 && (
            <p className="text-xs text-amber-400 mt-1">Password must be at least 8 characters</p>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
              placeholder="Confirm new password"
              autoComplete="new-password"
              enterKeyHint="done"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {showConfirm ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
          className="px-6 py-2 bg-white hover:bg-slate-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isChanging ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </section>
  );
}

/* ================================================================
   Section 3: Notifications
   ================================================================ */

function NotificationsSection() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch('/api/account/notification-preferences');
      if (res.ok) {
        const json = await res.json();
        setPreferences(json.data);
      } else {
        toast.error('Failed to load notification preferences');
      }
    } catch {
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;

    const newValue = !preferences[key];
    const optimistic = { ...preferences, [key]: newValue };
    setPreferences(optimistic);
    setSavingKey(key);

    try {
      const res = await fetch('/api/account/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (!res.ok) {
        // Revert on failure
        setPreferences(preferences);
        toast.error('Failed to update preference');
      }
    } catch {
      setPreferences(preferences);
      toast.error('Failed to update preference');
    } finally {
      setSavingKey(null);
    }
  };

  const handleFrequencyChange = async (value: string) => {
    if (!preferences) return;

    const prev = { ...preferences };
    setPreferences({ ...preferences, digestFrequency: value });
    setSavingKey('digestFrequency');

    try {
      const res = await fetch('/api/account/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digestFrequency: value }),
      });

      if (!res.ok) {
        setPreferences(prev);
        toast.error('Failed to update digest frequency');
      }
    } catch {
      setPreferences(prev);
      toast.error('Failed to update digest frequency');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-slate-700 rounded w-40" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="h-4 bg-slate-700 rounded w-32" />
                <div className="h-3 bg-slate-700 rounded w-56" />
              </div>
              <div className="h-6 w-11 bg-slate-700 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center text-slate-400">
        Unable to load notification preferences.
      </div>
    );
  }

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-2">Notification Preferences</h2>
      <p className="text-sm text-slate-400 mb-6">
        Control which notifications you receive and how
      </p>

      <div className="space-y-1">
        {NOTIFICATION_TOGGLES.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-b-0"
          >
            <div className="mr-4">
              <p className="text-sm font-medium text-white">{toggle.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{toggle.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!preferences[toggle.key]}
              onClick={() => handleToggle(toggle.key)}
              disabled={savingKey === toggle.key}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 ${
                preferences[toggle.key] ? 'bg-white' : 'bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                  preferences[toggle.key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Digest Frequency Dropdown */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Digest Frequency</p>
            <p className="text-xs text-slate-400 mt-0.5">How often you receive digest emails</p>
          </div>
          <select
            value={preferences.digestFrequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
            disabled={savingKey === 'digestFrequency'}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none disabled:opacity-50 sm:w-40"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Section 4: Appearance
   ================================================================ */

function AppearanceSection() {
  const [oledEnabled, setOledEnabled] = useState(false);

  useEffect(() => {
    setOledEnabled(localStorage.getItem('spacenexus-oled') === 'true');
  }, []);

  const handleToggleOled = () => {
    const next = !oledEnabled;
    setOledEnabled(next);
    localStorage.setItem('spacenexus-oled', String(next));
    document.documentElement.classList.toggle('oled', next);
  };

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-2">Appearance</h2>
      <p className="text-sm text-slate-400 mb-6">
        Customize how SpaceNexus looks on your device
      </p>

      <div className="space-y-1">
        <div className="flex items-center justify-between py-3 border-b border-slate-800/50">
          <div className="mr-4">
            <p className="text-sm font-medium text-white">OLED True Black Mode</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Uses pure black backgrounds to save battery on AMOLED screens
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={oledEnabled}
            onClick={handleToggleOled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              oledEnabled ? 'bg-white' : 'bg-slate-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                oledEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Section 5: Data & Privacy
   ================================================================ */

function DataPrivacySection() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) {
        toast.error('Failed to export data');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `spacenexus-data-export-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Data export downloaded successfully');
    } catch {
      toast.error('An error occurred during export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    setIsDeleting(true);

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          confirmation: deleteConfirmation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to delete account'));
        setIsDeleting(false);
        return;
      }

      toast.success('Account deleted successfully');
      await signOut({ redirect: false });
      router.push('/');
    } catch {
      toast.error('An error occurred. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Export Data */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Export Your Data</h2>
          <p className="text-sm text-slate-400 mb-4">
            Download a copy of all your SpaceNexus data including your profile, posts,
            messages, watchlists, and preferences. The export is provided as a JSON file.
          </p>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                Exporting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All Data
              </>
            )}
          </button>
        </section>

        {/* Delete Account */}
        <section className="bg-red-950/20 border border-red-900/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            Delete Account
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Permanently delete your account and all associated data including posts, messages,
            watchlists, API keys, and preferences. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Delete Account
          </button>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto">
            <h3 id="delete-account-title" className="text-xl font-bold text-red-400 mb-2">
              Delete Account
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              This will permanently delete your account, all your data,
              preferences, saved searches, watchlists, and API keys. This
              cannot be reversed.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Type <span className="font-mono text-red-400">DELETE MY ACCOUNT</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="DELETE MY ACCOUNT"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Enter your password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                  setDeletePassword('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={
                  isDeleting || deleteConfirmation !== 'DELETE MY ACCOUNT' || !deletePassword
                }
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-red-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
