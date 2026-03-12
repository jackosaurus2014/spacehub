import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

const SECURITY_FEATURES = [
  {
    title: 'Data Encryption',
    description: 'AES-256 encryption at rest, TLS 1.3 in transit. All data is encrypted end-to-end, ensuring your sensitive space industry intelligence remains protected at every stage.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    gradient: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },
  {
    title: 'Access Controls',
    description: 'Role-based access, SSO/SAML integration, MFA support. Fine-grained permissions ensure the right people have access to the right data at the right time.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    gradient: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    title: 'Infrastructure',
    description: 'Hosted on Railway with automatic scaling, redundancy, and global CDN. Our infrastructure is designed for high availability with automated failover and disaster recovery.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    title: 'Monitoring',
    description: '24/7 uptime monitoring, real-time alerting, automated incident response. Our operations team is notified immediately of any anomalies, ensuring rapid response times.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    title: 'Data Privacy',
    description: 'GDPR and CCPA compliant. Data residency controls, right to deletion. We give you full control over your data with transparent privacy practices and configurable policies.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    gradient: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    title: 'Audit Logging',
    description: 'Comprehensive audit trails for all user actions and API calls. Every access, modification, and export is logged with timestamps, user identity, and IP information.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    gradient: 'from-rose-500/20 to-pink-500/20',
    borderColor: 'border-rose-500/30',
    iconColor: 'text-rose-400',
  },
];

const COMPLIANCE_BADGES = [
  {
    title: 'SOC 2 Type II',
    status: 'In Progress',
    description: 'Comprehensive controls for security, availability, and confidentiality. Audit underway with completion expected Q2 2026.',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    badgeColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
  },
  {
    title: 'GDPR Compliant',
    status: 'Active',
    description: 'Full compliance with the EU General Data Protection Regulation, including data portability, right to erasure, and lawful processing.',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    badgeColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  {
    title: 'CCPA Compliant',
    status: 'Active',
    description: 'Full compliance with the California Consumer Privacy Act, including opt-out rights, data disclosure, and non-discrimination provisions.',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    badgeColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  {
    title: 'ITAR Aware',
    status: 'Procedures in Place',
    description: 'Data handling procedures designed for ITAR-controlled information. Isolated environments and restricted access for defense-related workflows.',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ),
    badgeColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 border-blue-500/30',
  },
];

const DATA_PRACTICES = [
  {
    text: 'We never sell your data to third parties',
    icon: (
      <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    text: 'You maintain full ownership of your data at all times',
    icon: (
      <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    text: 'Data exported on demand -- no vendor lock-in',
    icon: (
      <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    text: 'Automated data retention policies with configurable periods',
    icon: (
      <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function SecurityPage() {
  return (
    <>

      <div className="min-h-screen bg-[#050a15]">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Enterprise-Grade Protection
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Security &amp; Trust
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-6">
                Your space industry intelligence deserves the highest level of protection.
                SpaceNexus is built with security-first architecture, ensuring your data
                remains encrypted, access-controlled, and fully compliant with global standards.
              </p>
              <p className="text-sm text-slate-500 max-w-xl mx-auto">
                From encryption at rest to comprehensive audit trails, every layer of SpaceNexus
                is designed to meet the rigorous security demands of defense, aerospace, and
                government organizations.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Security Overview Grid */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal>
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
                Security at Every Layer
              </h2>
              <p className="text-slate-400 text-center max-w-xl mx-auto mb-10">
                Comprehensive protection across infrastructure, application, and data layers.
              </p>
            </ScrollReveal>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {SECURITY_FEATURES.map((feature) => (
                <StaggerItem key={feature.title}>
                  <div
                    className={`rounded-2xl border ${feature.borderColor} bg-gradient-to-br ${feature.gradient} p-6 h-full transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
                  >
                    <div className={`${feature.iconColor} mb-4`}>{feature.icon}</div>
                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{feature.description}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Compliance Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal>
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
                Compliance &amp; Certifications
              </h2>
              <p className="text-slate-400 text-center max-w-xl mx-auto mb-10">
                Meeting the highest standards for data protection and regulatory compliance
                in the space industry.
              </p>
            </ScrollReveal>
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {COMPLIANCE_BADGES.map((badge) => (
                <StaggerItem key={badge.title}>
                  <div className="rounded-2xl bg-slate-900/50 border border-slate-700/50 p-6 h-full text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${badge.badgeBg} border mb-4`}>
                      <div className={badge.badgeColor}>{badge.icon}</div>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">{badge.title}</h3>
                    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3 ${badge.badgeBg} border ${badge.badgeColor}`}>
                      {badge.status}
                    </span>
                    <p className="text-sm text-slate-400 leading-relaxed">{badge.description}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Data Handling Practices */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal>
              <div className="max-w-3xl mx-auto bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8 sm:p-10">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    Our Data Handling Promise
                  </h2>
                  <p className="text-slate-400 text-sm max-w-lg mx-auto">
                    Transparency is at the core of how we handle your data. Here are the
                    commitments we make to every SpaceNexus customer.
                  </p>
                </div>
                <div className="space-y-4">
                  {DATA_PRACTICES.map((practice) => (
                    <div
                      key={practice.text}
                      className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/30"
                    >
                      {practice.icon}
                      <span className="text-sm text-slate-200 leading-relaxed">{practice.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Vulnerability Disclosure */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal>
              <div className="max-w-3xl mx-auto bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8 sm:p-10">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="shrink-0">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30">
                      <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Vulnerability Disclosure</h2>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                      We take the security of our platform seriously and welcome responsible
                      disclosure of any vulnerabilities. If you discover a security issue,
                      please report it to our security team. We are committed to working with
                      the security community to verify, reproduce, and respond to legitimate
                      reports.
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                      We ask that you give us reasonable time to address the issue before
                      making any public disclosure. We will acknowledge receipt of your
                      report within 48 hours and provide regular updates on our progress.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">Contact:</span>
                      <a
                        href="mailto:security@spacenexus.us"
                        className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
                      >
                        security@spacenexus.us
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* CTA: Have Security Questions? */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal>
              <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-2xl p-8 sm:p-12">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Have Security Questions?
                </h2>
                <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                  Our security team is ready to answer your questions, provide compliance
                  documentation, or walk you through our security architecture.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/contact?utm_source=security&utm_medium=cta&utm_campaign=security-inquiry"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                  >
                    Contact Our Security Team
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/enterprise"
                    className="inline-flex items-center gap-2 px-8 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-lg transition-colors"
                  >
                    Enterprise Solutions
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Related Modules */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <RelatedModules
              modules={getRelatedModules('security')}
              title="Explore Related Modules"
            />
          </div>
        </section>
      </div>
    </>
  );
}
