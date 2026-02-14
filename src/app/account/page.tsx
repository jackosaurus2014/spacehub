'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500" />
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

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
        toast.error(data.error || 'Failed to delete account');
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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-slate-400 mb-8">
          Manage your SpaceNexus account
        </p>

        {/* Account Info */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-slate-400">Email</span>
              <p className="text-white">{session.user?.email}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Name</span>
              <p className="text-white">{session.user?.name || 'Not set'}</p>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            <Link
              href="/privacy"
              className="block text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="block text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/faq"
              className="block text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              FAQ & Support
            </Link>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-950/20 border border-red-900/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            Danger Zone
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Permanently delete your account and all associated data. This action
            cannot be undone.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-400 mb-2">
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
    </div>
  );
}
