import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Data Safety',
  description: 'Learn how SpaceNexus handles your data. Transparent disclosure of data collection, sharing, security practices, and your choices — aligned with Google Play Data Safety requirements.',
  alternates: { canonical: 'https://spacenexus.us/data-safety' },
};

export const revalidate = 86400;

interface DataCategory {
  type: string;
  collected: string[];
  purpose: string;
  shared: boolean;
  sharedWith?: string;
  optional: boolean;
}

const dataCategories: DataCategory[] = [
  {
    type: 'Account Information',
    collected: ['Name', 'Email address', 'Profile photo (optional)', 'Professional role'],
    purpose: 'Account creation, authentication, and personalized experience',
    shared: false,
    optional: false,
  },
  {
    type: 'Usage Data',
    collected: ['Pages visited', 'Features used', 'Session duration', 'Device type'],
    purpose: 'Analytics, performance monitoring, and product improvement',
    shared: true,
    sharedWith: 'Google Analytics (aggregated, anonymized)',
    optional: false,
  },
  {
    type: 'Subscription & Payment',
    collected: ['Payment method (via Stripe)', 'Subscription tier', 'Billing history'],
    purpose: 'Payment processing and subscription management',
    shared: true,
    sharedWith: 'Stripe (PCI-compliant payment processor)',
    optional: true,
  },
  {
    type: 'Alerts & Preferences',
    collected: ['Watchlist items', 'Alert rules', 'Notification preferences', 'Dashboard layout'],
    purpose: 'Delivering personalized alerts and saved preferences',
    shared: false,
    optional: true,
  },
  {
    type: 'Newsletter & Communications',
    collected: ['Email address', 'Subscription preferences', 'Open/click tracking'],
    purpose: 'Sending newsletters, digests, and product updates',
    shared: false,
    optional: true,
  },
  {
    type: 'Community & Forum',
    collected: ['Posts', 'Comments', 'Votes', 'Profile information'],
    purpose: 'Community features, moderation, and user engagement',
    shared: false,
    optional: true,
  },
  {
    type: 'Device & Technical',
    collected: ['Browser type', 'Operating system', 'Screen resolution', 'IP address (anonymized)'],
    purpose: 'Compatibility, security, and abuse prevention',
    shared: false,
    optional: false,
  },
  {
    type: 'Push Notifications',
    collected: ['Push subscription endpoint', 'Notification preferences'],
    purpose: 'Delivering real-time launch alerts and space weather notifications',
    shared: false,
    optional: true,
  },
];

const securityPractices = [
  { label: 'Encryption in transit', description: 'All data transmitted over HTTPS/TLS 1.3' },
  { label: 'Encryption at rest', description: 'Database encrypted with AES-256 on Railway infrastructure' },
  { label: 'Access controls', description: 'Role-based access with secure session management' },
  { label: 'No data selling', description: 'We never sell your personal data to third parties' },
  { label: 'Data minimization', description: 'We only collect data necessary for the service' },
  { label: 'Regular audits', description: 'Periodic security reviews and dependency updates' },
  { label: 'CSRF protection', description: 'Origin/Referer header verification on all mutations' },
  { label: 'Rate limiting', description: 'Sliding-window rate limits to prevent abuse' },
];

export default function DataSafetyPage() {
  const lastUpdated = 'March 18, 2026';

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Data Safety"
          subtitle="How SpaceNexus collects, uses, and protects your data"
          icon="🛡️"
          accentColor="green"
        >
          <Link href="/privacy" className="btn-secondary text-sm py-2 px-4">
            Full Privacy Policy
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Overview Card */}
          <ScrollReveal>
            <div className="card p-6 border border-green-500/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Our Commitment</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    SpaceNexus is committed to transparency about how we handle your data.
                    This page provides a clear summary of our data practices, aligned with
                    Google Play&apos;s Data Safety requirements. For the complete legal policy,
                    see our <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">Privacy Policy</Link>.
                  </p>
                  <p className="text-slate-500 text-xs mt-2">Last updated: {lastUpdated}</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Quick Summary Badges */}
          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: '🔒', label: 'Data encrypted', sublabel: 'In transit & at rest' },
                { icon: '🚫', label: 'No data sold', sublabel: 'To third parties' },
                { icon: '🗑️', label: 'Data deletable', sublabel: 'Request anytime' },
                { icon: '👤', label: 'You control', sublabel: 'Your data choices' },
              ].map((badge) => (
                <div key={badge.label} className="card p-4 text-center">
                  <span className="text-2xl mb-2 block">{badge.icon}</span>
                  <p className="text-white text-sm font-medium">{badge.label}</p>
                  <p className="text-slate-500 text-xs">{badge.sublabel}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Data Collection Table */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-cyan-400 bg-clip-text text-transparent mb-6">
                Data We Collect
              </h2>

              <div className="space-y-4">
                {dataCategories.map((cat) => (
                  <div key={cat.type} className="border border-white/[0.06] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">{cat.type}</h3>
                      <div className="flex items-center gap-2">
                        {cat.optional && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Optional
                          </span>
                        )}
                        {cat.shared ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Shared
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            Not shared
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {cat.collected.map((item) => (
                        <span key={item} className="text-xs px-2 py-1 rounded-md bg-white/[0.04] text-slate-400">
                          {item}
                        </span>
                      ))}
                    </div>

                    <p className="text-slate-500 text-xs">
                      <span className="text-slate-400 font-medium">Purpose:</span> {cat.purpose}
                    </p>
                    {cat.shared && cat.sharedWith && (
                      <p className="text-slate-500 text-xs mt-1">
                        <span className="text-amber-400/70 font-medium">Shared with:</span> {cat.sharedWith}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Security Practices */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-green-400 bg-clip-text text-transparent mb-6">
                Security Practices
              </h2>

              <div className="grid md:grid-cols-2 gap-3">
                {securityPractices.map((practice) => (
                  <div key={practice.label} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                    <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <div>
                      <p className="text-white text-sm font-medium">{practice.label}</p>
                      <p className="text-slate-500 text-xs">{practice.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Data Retention */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">
                Data Retention & Deletion
              </h2>
              <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-mono text-xs mt-1 shrink-0">01</span>
                  <p><span className="text-white font-medium">Account data</span> is retained as long as your account is active. Delete your account to remove all personal data within 30 days.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-mono text-xs mt-1 shrink-0">02</span>
                  <p><span className="text-white font-medium">Usage analytics</span> are aggregated and anonymized after 26 months, following Google Analytics data retention policies.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-mono text-xs mt-1 shrink-0">03</span>
                  <p><span className="text-white font-medium">Payment data</span> is stored and managed by Stripe. SpaceNexus does not store credit card numbers or full payment details.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 font-mono text-xs mt-1 shrink-0">04</span>
                  <p><span className="text-white font-medium">Community content</span> (posts, comments) remains visible after account deletion unless you request content removal.</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Your Choices */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-purple-400 bg-clip-text text-transparent mb-4">
                Your Choices
              </h2>
              <div className="space-y-3">
                {[
                  { action: 'Opt out of analytics', how: 'Use browser Do Not Track or install a GA opt-out extension' },
                  { action: 'Unsubscribe from emails', how: 'Click "Unsubscribe" in any email or manage preferences in Account Settings' },
                  { action: 'Disable push notifications', how: 'Revoke notification permission in your browser or device settings' },
                  { action: 'Delete your account', how: 'Contact support@spacenexus.us or use Account Settings > Delete Account' },
                  { action: 'Export your data', how: 'Request a data export by emailing support@spacenexus.us' },
                  { action: 'Manage cookies', how: 'Adjust cookie preferences in your browser settings' },
                ].map((choice) => (
                  <div key={choice.action} className="flex items-start gap-3 p-3 rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                    <svg className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                    </svg>
                    <div>
                      <p className="text-white text-sm font-medium">{choice.action}</p>
                      <p className="text-slate-500 text-xs">{choice.how}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Contact & Links */}
          <ScrollReveal>
            <div className="card p-6 text-center">
              <h2 className="text-lg font-semibold text-white mb-2">Questions About Your Data?</h2>
              <p className="text-slate-400 text-sm mb-4">
                Contact our team for any data privacy questions or requests.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Contact Us
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                >
                  Full Privacy Policy
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
