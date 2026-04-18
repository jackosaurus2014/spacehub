'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';
import { extractApiError } from '@/lib/errors';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface FormState {
  title: string;
  organization: string;
  conferenceName: string;
  topic: string;
  description: string;
  eventDate: string;
  submissionDeadline: string;
  location: string;
  isRemote: boolean;
  compensation: string;
  audienceSize: string;
  cfpUrl: string;
  contactEmail: string;
  contactName: string;
  tags: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  organization: '',
  conferenceName: '',
  topic: '',
  description: '',
  eventDate: '',
  submissionDeadline: '',
  location: '',
  isRemote: false,
  compensation: '',
  audienceSize: '',
  cfpUrl: '',
  contactEmail: '',
  contactName: '',
  tags: '',
};

export default function SubmitSpeakingOpportunityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-semibold text-white mb-2">Sign in required</h1>
            <p className="text-star-300 mb-4 text-sm">
              You need an account to submit a speaking opportunity. This keeps the
              board useful and reduces spam.
            </p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/login?redirect=/speaking/submit"
                className="btn-primary py-2 px-4 text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm py-2 px-4 rounded-lg border border-white/10 text-white hover:bg-white/[0.04]"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});

    try {
      const body = {
        title: form.title,
        organization: form.organization,
        conferenceName: form.conferenceName || null,
        topic: form.topic,
        description: form.description,
        eventDate: form.eventDate,
        submissionDeadline: form.submissionDeadline || null,
        location: form.location || null,
        isRemote: form.isRemote,
        compensation: form.compensation || null,
        audienceSize: form.audienceSize || null,
        cfpUrl: form.cfpUrl || null,
        contactEmail: form.contactEmail || null,
        contactName: form.contactName || null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const res = await fetch('/api/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Zod validation errors
        if (data?.error?.details && typeof data.error.details === 'object') {
          const flat: Record<string, string> = {};
          for (const [k, v] of Object.entries(data.error.details)) {
            if (Array.isArray(v)) flat[k] = v[0];
            else if (typeof v === 'string') flat[k] = v;
          }
          setFieldErrors(flat);
        }
        const msg = extractApiError(data, 'Submission failed');
        toast.error(msg);
        return;
      }

      toast.success('Submitted! An admin will review and approve your listing.');
      const newId = data?.data?.opportunity?.id as string | undefined;
      if (newId) {
        router.push(`/speaking/${newId}`);
      } else {
        router.push('/speaking');
      }
    } catch (err) {
      clientLogger.error('Failed to submit speaking opportunity', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-4 text-sm">
          <Link href="/speaking" className="text-star-300 hover:text-white">
            ← Speaking Opportunities
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Submit a Speaking Opportunity
          </h1>
          <p className="text-star-300 text-sm">
            Share a call for papers, panel invitation, or keynote slot. All submissions
            are reviewed by an admin before appearing on the public board.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section title="Opportunity">
            <Field label="Title" error={fieldErrors.title} required>
              <input
                type="text"
                required
                maxLength={300}
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="input w-full"
                placeholder="e.g. Keynote search — Space Symposium 2026"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Organization" error={fieldErrors.organization} required>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.organization}
                  onChange={(e) => update('organization', e.target.value)}
                  className="input w-full"
                  placeholder="Space Foundation"
                />
              </Field>
              <Field label="Conference / event name" error={fieldErrors.conferenceName}>
                <input
                  type="text"
                  maxLength={200}
                  value={form.conferenceName}
                  onChange={(e) => update('conferenceName', e.target.value)}
                  className="input w-full"
                  placeholder="Space Symposium 2026"
                />
              </Field>
            </div>

            <Field label="Topic" error={fieldErrors.topic} required>
              <input
                type="text"
                required
                maxLength={200}
                value={form.topic}
                onChange={(e) => update('topic', e.target.value)}
                className="input w-full"
                placeholder="Orbital debris remediation"
              />
            </Field>

            <Field label="Description" error={fieldErrors.description} required>
              <textarea
                required
                minLength={20}
                maxLength={10000}
                rows={6}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className="input w-full resize-y"
                placeholder="What are you looking for? Who is the audience? Session format? Word count / time limit?"
              />
            </Field>
          </Section>

          <Section title="Logistics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Event date" error={fieldErrors.eventDate} required>
                <input
                  type="date"
                  required
                  value={form.eventDate}
                  onChange={(e) => update('eventDate', e.target.value)}
                  className="input w-full"
                />
              </Field>
              <Field
                label="Submission deadline"
                error={fieldErrors.submissionDeadline}
              >
                <input
                  type="date"
                  value={form.submissionDeadline}
                  onChange={(e) => update('submissionDeadline', e.target.value)}
                  className="input w-full"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Location" error={fieldErrors.location}>
                <input
                  type="text"
                  maxLength={200}
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  className="input w-full"
                  placeholder="Colorado Springs, CO, USA"
                />
              </Field>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-sm text-star-200 cursor-pointer mt-6">
                  <input
                    type="checkbox"
                    checked={form.isRemote}
                    onChange={(e) => update('isRemote', e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/[0.04]"
                  />
                  Remote / virtual participation OK
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Compensation" error={fieldErrors.compensation}>
                <input
                  type="text"
                  maxLength={200}
                  value={form.compensation}
                  onChange={(e) => update('compensation', e.target.value)}
                  className="input w-full"
                  placeholder="e.g. $500 honorarium + travel covered"
                />
              </Field>
              <Field label="Expected audience size" error={fieldErrors.audienceSize}>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  value={form.audienceSize}
                  onChange={(e) => update('audienceSize', e.target.value)}
                  className="input w-full"
                  placeholder="e.g. 800"
                />
              </Field>
            </div>
          </Section>

          <Section title="Links & Contact">
            <Field label="Call for Papers URL" error={fieldErrors.cfpUrl}>
              <input
                type="url"
                maxLength={2048}
                value={form.cfpUrl}
                onChange={(e) => update('cfpUrl', e.target.value)}
                className="input w-full"
                placeholder="https://example.com/cfp"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact name" error={fieldErrors.contactName}>
                <input
                  type="text"
                  maxLength={200}
                  value={form.contactName}
                  onChange={(e) => update('contactName', e.target.value)}
                  className="input w-full"
                  placeholder="Optional"
                />
              </Field>
              <Field label="Contact email" error={fieldErrors.contactEmail}>
                <input
                  type="email"
                  maxLength={255}
                  value={form.contactEmail}
                  onChange={(e) => update('contactEmail', e.target.value)}
                  className="input w-full"
                  placeholder="cfp@organization.org"
                />
              </Field>
            </div>

            <Field
              label="Tags (comma-separated)"
              error={fieldErrors.tags}
              hint="e.g. policy, GNC, launch-ops, lunar"
            >
              <input
                type="text"
                value={form.tags}
                onChange={(e) => update('tags', e.target.value)}
                className="input w-full"
                placeholder="policy, GNC, launch-ops"
              />
            </Field>
          </Section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary py-2.5 px-6 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
            <Link
              href="/speaking"
              className="text-sm py-2 px-4 rounded-lg border border-white/10 text-white hover:bg-white/[0.04]"
            >
              Cancel
            </Link>
            <span className="text-xs text-star-400 ml-auto">
              Submissions start in pending status.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6 border border-white/[0.08] space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-star-300">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-star-200 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && <p className="text-xs text-star-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </label>
  );
}
