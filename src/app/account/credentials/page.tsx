'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const dynamic = 'force-dynamic';

type CredentialType = 'degree' | 'certification' | 'clearance' | 'license' | 'patent';
type CredentialStatus = 'self_reported' | 'pending' | 'verified' | 'rejected';

interface Credential {
  id: string;
  credentialType: CredentialType;
  title: string;
  issuingOrg: string;
  issuedAt: string | null;
  expiresAt: string | null;
  credentialId: string | null;
  verificationUrl: string | null;
  supportingDocUrl: string | null;
  status: CredentialStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const CREDENTIAL_TYPES: { value: CredentialType; label: string; hint: string }[] = [
  { value: 'degree', label: 'Degree', hint: 'e.g. M.S. Aerospace Engineering' },
  { value: 'certification', label: 'Certification', hint: 'e.g. AWS Solutions Architect' },
  { value: 'clearance', label: 'Clearance', hint: 'e.g. DoD Secret (do not include details)' },
  { value: 'license', label: 'License', hint: 'e.g. FCC Amateur Extra' },
  { value: 'patent', label: 'Patent', hint: 'e.g. Granted US Patent' },
];

const STATUS_STYLES: Record<CredentialStatus, { label: string; classes: string }> = {
  self_reported: {
    label: 'Self-reported',
    classes: 'bg-white/[0.06] text-slate-300 border border-white/10',
  },
  pending: {
    label: 'Pending review',
    classes: 'bg-amber-950/40 text-amber-300 border border-amber-700/50',
  },
  verified: {
    label: 'Verified',
    classes: 'bg-emerald-950/40 text-emerald-300 border border-emerald-700/50',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-950/40 text-red-300 border border-red-700/50',
  },
};

export default function CredentialsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account/credentials');
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to load credentials'));
        return;
      }
      setCredentials(data.data?.credentials ?? []);
    } catch {
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCredentials();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, fetchCredentials, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <nav className="text-sm text-slate-400 mb-4">
          <Link href="/account" className="hover:text-white transition-colors">
            Account
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-white/70">Credentials</span>
        </nav>

        <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">Professional Credentials</h1>
            <p className="text-slate-400 max-w-2xl">
              Add degrees, certifications, clearances, licenses, and patents.
              Submit any of them for admin review to earn a verified badge that
              appears on your public profile.
            </p>
          </div>
          {!showAddForm && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              + Add credential
            </button>
          )}
        </header>

        {showAddForm && (
          <CredentialForm
            mode="create"
            onClose={() => setShowAddForm(false)}
            onSaved={() => {
              setShowAddForm(false);
              fetchCredentials();
            }}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        ) : credentials.length === 0 && !showAddForm ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-12 text-center">
            <h2 className="text-lg font-semibold mb-1">No credentials yet</h2>
            <p className="text-sm text-slate-400 mb-4">
              Add your first credential to start building your verified profile.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors"
            >
              Add credential
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) =>
              editingId === cred.id ? (
                <CredentialForm
                  key={cred.id}
                  mode="edit"
                  credential={cred}
                  onClose={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    fetchCredentials();
                  }}
                />
              ) : (
                <CredentialRow
                  key={cred.id}
                  credential={cred}
                  onEdit={() => setEditingId(cred.id)}
                  onChanged={fetchCredentials}
                />
              )
            )}
          </div>
        )}

        <section className="mt-8 bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-2">
            Privacy notes
          </h3>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>Only <span className="text-emerald-400">verified</span> credentials are visible on your public profile.</li>
            <li>For clearances, never store the specific classification level or program details — only the existence of a clearance is shown publicly.</li>
            <li>Supporting documents and credential IDs are visible only to you and the admin reviewer.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ================================================================
   Credential row
   ================================================================ */

interface CredentialRowProps {
  credential: Credential;
  onEdit: () => void;
  onChanged: () => void;
}

function CredentialRow({ credential, onEdit, onChanged }: CredentialRowProps) {
  const [busy, setBusy] = useState<'submit' | 'delete' | null>(null);
  const styles = STATUS_STYLES[credential.status];
  const typeLabel =
    CREDENTIAL_TYPES.find((t) => t.value === credential.credentialType)
      ?.label ?? credential.credentialType;

  const handleRequestVerification = async () => {
    if (!credential.verificationUrl && !credential.supportingDocUrl) {
      toast.error(
        'Add a verification URL or supporting document before requesting review.'
      );
      return;
    }
    setBusy('submit');
    try {
      const res = await fetch(
        `/api/account/credentials/${credential.id}/request-verification`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to submit for review'));
        return;
      }
      toast.success('Submitted for admin review');
      onChanged();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this credential? This cannot be undone.')) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/account/credentials/${credential.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to delete credential'));
        return;
      }
      toast.success('Credential deleted');
      onChanged();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 capitalize">
              {typeLabel}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-medium ${styles.classes}`}
            >
              {styles.label}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white truncate">
            {credential.title}
          </h3>
          <p className="text-sm text-slate-400 truncate">
            {credential.issuingOrg}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            disabled={busy !== null}
            className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 rounded text-xs transition-colors disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={busy !== null}
            className="px-3 py-1.5 border border-red-500/30 text-red-300 hover:bg-red-500/10 rounded text-xs transition-colors disabled:opacity-50"
          >
            {busy === 'delete' ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 mt-3">
        {credential.issuedAt && (
          <div>
            <dt className="text-slate-500">Issued</dt>
            <dd className="text-slate-200">
              {new Date(credential.issuedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </dd>
          </div>
        )}
        {credential.expiresAt && (
          <div>
            <dt className="text-slate-500">Expires</dt>
            <dd className="text-slate-200">
              {new Date(credential.expiresAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </dd>
          </div>
        )}
        {credential.credentialId && (
          <div>
            <dt className="text-slate-500">ID</dt>
            <dd className="text-slate-200 truncate" title={credential.credentialId}>
              {credential.credentialId}
            </dd>
          </div>
        )}
        {credential.verifiedAt && (
          <div>
            <dt className="text-slate-500">Verified</dt>
            <dd className="text-emerald-300">
              {new Date(credential.verifiedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </dd>
          </div>
        )}
      </dl>

      {(credential.verificationUrl || credential.supportingDocUrl) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {credential.verificationUrl && (
            <a
              href={credential.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-white/[0.05] hover:bg-white/[0.08] text-blue-300 rounded transition-colors"
            >
              Verification link ↗
            </a>
          )}
          {credential.supportingDocUrl && (
            <a
              href={credential.supportingDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-white/[0.05] hover:bg-white/[0.08] text-blue-300 rounded transition-colors"
            >
              Supporting doc ↗
            </a>
          )}
        </div>
      )}

      {credential.status === 'rejected' && credential.rejectionReason && (
        <div className="mt-3 bg-red-950/30 border border-red-900/40 rounded p-3">
          <p className="text-xs uppercase tracking-wider text-red-300 mb-1">
            Rejection reason
          </p>
          <p className="text-sm text-slate-200 whitespace-pre-wrap">
            {credential.rejectionReason}
          </p>
        </div>
      )}

      {(credential.status === 'self_reported' ||
        credential.status === 'rejected') && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <button
            onClick={handleRequestVerification}
            disabled={busy !== null}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            {busy === 'submit'
              ? 'Submitting...'
              : credential.status === 'rejected'
                ? 'Resubmit for review'
                : 'Request verification'}
          </button>
          {!credential.verificationUrl && !credential.supportingDocUrl && (
            <p className="text-xs text-amber-400 mt-2">
              Add a verification URL or supporting document URL before requesting review.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/* ================================================================
   Credential form (create + edit)
   ================================================================ */

interface CredentialFormProps {
  mode: 'create' | 'edit';
  credential?: Credential;
  onClose: () => void;
  onSaved: () => void;
}

function CredentialForm({
  mode,
  credential,
  onClose,
  onSaved,
}: CredentialFormProps) {
  const [credentialType, setCredentialType] = useState<CredentialType>(
    credential?.credentialType ?? 'degree'
  );
  const [title, setTitle] = useState(credential?.title ?? '');
  const [issuingOrg, setIssuingOrg] = useState(credential?.issuingOrg ?? '');
  const [issuedAt, setIssuedAt] = useState(
    credential?.issuedAt ? credential.issuedAt.slice(0, 10) : ''
  );
  const [expiresAt, setExpiresAt] = useState(
    credential?.expiresAt ? credential.expiresAt.slice(0, 10) : ''
  );
  const [credentialId, setCredentialId] = useState(credential?.credentialId ?? '');
  const [verificationUrl, setVerificationUrl] = useState(
    credential?.verificationUrl ?? ''
  );
  const [supportingDocUrl, setSupportingDocUrl] = useState(
    credential?.supportingDocUrl ?? ''
  );
  const [submitting, setSubmitting] = useState(false);

  const typeHint =
    CREDENTIAL_TYPES.find((t) => t.value === credentialType)?.hint ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.error('Title must be at least 2 characters');
      return;
    }
    if (issuingOrg.trim().length < 2) {
      toast.error('Issuing organization must be at least 2 characters');
      return;
    }
    setSubmitting(true);
    try {
      const url =
        mode === 'create'
          ? '/api/account/credentials'
          : `/api/account/credentials/${credential!.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialType,
          title: title.trim(),
          issuingOrg: issuingOrg.trim(),
          issuedAt: issuedAt || undefined,
          expiresAt: expiresAt || undefined,
          credentialId: credentialId.trim() || undefined,
          verificationUrl: verificationUrl.trim() || undefined,
          supportingDocUrl: supportingDocUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to save credential'));
        return;
      }
      toast.success(
        mode === 'create' ? 'Credential added' : 'Credential updated'
      );
      onSaved();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/[0.04] border border-white/[0.1] rounded-lg p-5 mb-4 space-y-4"
    >
      <h2 className="text-lg font-semibold">
        {mode === 'create' ? 'Add credential' : 'Edit credential'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="credential-type"
            className="block text-sm text-slate-300 mb-1.5"
          >
            Type <span className="text-red-400">*</span>
          </label>
          <select
            id="credential-type"
            value={credentialType}
            onChange={(e) => setCredentialType(e.target.value as CredentialType)}
            disabled={submitting}
            className="w-full px-3 py-2 h-11 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {typeHint && (
            <p className="text-xs text-slate-500 mt-1">{typeHint}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="credential-title"
            className="block text-sm text-slate-300 mb-1.5"
          >
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id="credential-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={200}
            disabled={submitting}
            placeholder="e.g. M.S. Aerospace Engineering"
            className="w-full px-3 py-2 h-11 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        <div>
          <label
            htmlFor="credential-org"
            className="block text-sm text-slate-300 mb-1.5"
          >
            Issuing organization <span className="text-red-400">*</span>
          </label>
          <input
            id="credential-org"
            type="text"
            value={issuingOrg}
            onChange={(e) => setIssuingOrg(e.target.value)}
            required
            minLength={2}
            maxLength={200}
            disabled={submitting}
            placeholder="e.g. MIT, FAA, USPTO"
            className="w-full px-3 py-2 h-11 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        <div>
          <label
            htmlFor="credential-id"
            className="block text-sm text-slate-300 mb-1.5"
          >
            Credential ID{' '}
            <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="credential-id"
            type="text"
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            maxLength={200}
            disabled={submitting}
            placeholder="License number, diploma id, etc."
            className="w-full px-3 py-2 h-11 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        <div>
          <label
            htmlFor="credential-issued"
            className="block text-sm text-slate-300 mb-1.5"
          >
            Issued{' '}
            <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="credential-issued"
            type="date"
            value={issuedAt}
            onChange={(e) => setIssuedAt(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 h-11 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        <div>
          <label
            htmlFor="credential-expires"
            className="block text-sm text-slate-300 mb-1.5"
          >
            Expires{' '}
            <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="credential-expires"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 h-11 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="credential-verification-url"
          className="block text-sm text-slate-300 mb-1.5"
        >
          Verification URL{' '}
          <span className="text-slate-500 font-normal">
            (public proof — registry, transcript portal, etc.)
          </span>
        </label>
        <input
          id="credential-verification-url"
          type="url"
          value={verificationUrl}
          onChange={(e) => setVerificationUrl(e.target.value)}
          maxLength={500}
          disabled={submitting}
          placeholder="https://..."
          className="w-full px-3 py-2 h-11 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
      </div>

      <div>
        <label
          htmlFor="credential-supporting-url"
          className="block text-sm text-slate-300 mb-1.5"
        >
          Supporting document URL{' '}
          <span className="text-slate-500 font-normal">
            (link to a private document only the admin reviewer will see)
          </span>
        </label>
        <input
          id="credential-supporting-url"
          type="url"
          value={supportingDocUrl}
          onChange={(e) => setSupportingDocUrl(e.target.value)}
          maxLength={500}
          disabled={submitting}
          placeholder="https://..."
          className="w-full px-3 py-2 h-11 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
        {mode === 'create' && (
          <p className="text-xs text-slate-500 mt-1">
            Adding a supporting document automatically queues this credential for review.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
        >
          {submitting
            ? 'Saving...'
            : mode === 'create'
              ? 'Add credential'
              : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
