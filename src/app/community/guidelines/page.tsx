import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export const metadata = {
  title: 'Community Guidelines | SpaceNexus',
  description: 'Community guidelines and code of conduct for SpaceNexus, the space industry intelligence platform. Includes ITAR/EAR export control obligations and content policies.',
};

export const revalidate = 86400;

export default function CommunityGuidelinesPage() {
  const lastUpdated = 'February 21, 2026';

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <PageHeader
          title="Community Guidelines"
          subtitle="Standards for participation in the SpaceNexus community"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Community', href: '/community' },
            { label: 'Guidelines' },
          ]}
        >
          <Link href="/community" className="btn-secondary text-sm py-2 px-4">
            Back to Community
          </Link>
        </PageHeader>

        <div className="max-w-4xl mx-auto">
          <div className="card p-8 space-y-8">
            <p className="text-slate-400 text-sm">Last Updated: {lastUpdated}</p>

            {/* Introduction */}
            <section>
              <p className="text-slate-400 leading-relaxed">
                SpaceNexus is a professional community for the global space industry. Our forums,
                company profiles, marketplace, and collaboration tools exist to help aerospace
                professionals share knowledge, discover opportunities, and advance the industry
                together. These guidelines establish the standards of behavior we expect from every
                participant. By using any community feature on SpaceNexus, you agree to abide by
                these guidelines and our{' '}
                <Link href="/terms" className="text-nebula-300 hover:text-nebula-200 underline">
                  Terms of Service
                </Link>.
              </p>
            </section>

            {/* Code of Conduct */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Code of Conduct</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                All community members are expected to conduct themselves professionally and
                respectfully. The space industry depends on trust, collaboration, and precision,
                and our community should reflect those values.
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>
                  <strong>Professional behavior:</strong> Communicate as you would in a professional
                  workplace. Treat all members with courtesy and respect, regardless of their role,
                  experience level, or organization.
                </li>
                <li>
                  <strong>Respectful discourse:</strong> Disagreements are natural in technical
                  discussions. Challenge ideas, not people. Avoid personal attacks, name-calling,
                  and dismissive language.
                </li>
                <li>
                  <strong>Constructive discussion:</strong> Contribute substantively. Ask thoughtful
                  questions, provide well-reasoned answers, and share knowledge that benefits the
                  community. Avoid low-effort posts and off-topic derailing.
                </li>
                <li>
                  <strong>Good faith engagement:</strong> Assume good intentions from other
                  community members. If a message seems unclear or potentially offensive, seek
                  clarification before reacting. Give people the benefit of the doubt.
                </li>
              </ul>
            </section>

            {/* Prohibited Content */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Prohibited Content</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                The following content is strictly prohibited across all SpaceNexus community features,
                including forums, messages, comments, profiles, and marketplace listings:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Harassment, threats, bullying, or intimidation of any kind</li>
                <li>
                  Hate speech or discrimination based on protected characteristics including race,
                  ethnicity, national origin, religion, gender, gender identity, sexual orientation,
                  disability, or age
                </li>
                <li>Spam, unsolicited promotions, or deceptive content</li>
                <li>Doxxing or sharing private or personal information without consent</li>
                <li>Impersonation of other users, companies, or organizations</li>
                <li>Sexually explicit or gratuitously violent content</li>
                <li>Content that violates any applicable federal, state, or international law</li>
              </ul>
            </section>

            {/* ITAR/EAR Export Control */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                3. ITAR/EAR Export Control Obligations
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p className="text-amber-800 font-semibold text-lg">
                    Export Control Warning
                  </p>
                </div>
                <div className="space-y-4 text-amber-900">
                  <p className="leading-relaxed">
                    The space industry is heavily regulated by U.S. export control laws. All SpaceNexus
                    community members bear personal responsibility for ensuring their posts and
                    shared materials comply with these regulations.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>
                      <strong>Users MUST NOT share ITAR-controlled technical data</strong> as defined
                      under the International Traffic in Arms Regulations (22 CFR 120-130). This
                      includes technical data related to defense articles on the United States
                      Munitions List (USML), such as spacecraft components, launch vehicle
                      technology, and satellite subsystems.
                    </li>
                    <li>
                      <strong>Users MUST NOT share EAR-restricted information</strong> as defined
                      under the Export Administration Regulations (15 CFR 730-774). This includes
                      dual-use technologies controlled under the Commerce Control List (CCL).
                    </li>
                    <li>
                      <strong>No classified or Controlled Unclassified Information (CUI)</strong> may
                      be posted in any community feature, including forums, messages, marketplace
                      listings, or company profiles.
                    </li>
                    <li>
                      <strong>Posting controlled data on a public forum does NOT make it
                      &quot;public domain.&quot;</strong> The unauthorized disclosure of ITAR- or
                      EAR-controlled information on any platform, including SpaceNexus, constitutes
                      an export violation regardless of the platform&apos;s public accessibility.
                    </li>
                  </ul>
                  <p className="leading-relaxed">
                    Violations of export control regulations may be reported by SpaceNexus to the
                    Directorate of Defense Trade Controls (DDTC) at the U.S. Department of State
                    and/or the Bureau of Industry and Security (BIS) at the U.S. Department of
                    Commerce, as applicable.
                  </p>
                  <div className="bg-amber-100 border border-amber-300 rounded p-4 mt-4">
                    <p className="font-semibold text-amber-900">
                      Penalties: ITAR violations carry civil penalties up to $1,000,000 per violation
                      and criminal penalties including fines up to $1,000,000 and imprisonment for
                      up to 20 years per violation (22 U.S.C. Section 2778). EAR violations carry civil
                      penalties up to $300,000 per violation and criminal penalties up to $1,000,000
                      and 20 years imprisonment (50 U.S.C. Section 4819).
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed mt-4">
                If you are unsure whether specific information is export-controlled, do not post it.
                Consult your organization&apos;s export compliance officer or legal counsel before
                sharing any technical data related to defense or dual-use technologies.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Intellectual Property</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Respect the intellectual property rights of others. When sharing content in the
                community:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>
                  Do not post content you do not have the right to share, including copyrighted
                  articles, proprietary documents, trade secrets, or patented material
                </li>
                <li>
                  When referencing or quoting third-party sources, provide proper attribution and
                  limit excerpts to fair use
                </li>
                <li>
                  Do not reproduce substantial portions of paywalled or subscription-only content
                </li>
                <li>
                  If you believe your copyrighted work has been used without authorization on
                  SpaceNexus, please review our{' '}
                  <Link href="/legal/dmca" className="text-nebula-300 hover:text-nebula-200 underline">
                    DMCA &amp; Copyright Policy
                  </Link>{' '}
                  and file a takedown notice
                </li>
              </ul>
            </section>

            {/* Enforcement & Consequences */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                5. Enforcement &amp; Consequences
              </h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Violations of these guidelines are handled on a progressive scale based on severity
                and frequency. SpaceNexus administrators reserve the right to take any action they
                deem appropriate, including but not limited to the following:
              </p>

              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-700 font-medium">First Violation: Written Warning</p>
                  <p className="text-slate-400 text-sm mt-1">
                    A private written warning identifying the violation and the relevant guideline.
                    The offending content may be edited or removed.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-700 font-medium">
                    Second Violation: Temporary Mute (24 hours to 30 days)
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Your ability to post in community features will be temporarily suspended.
                    Duration depends on the nature and severity of the violation.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-700 font-medium">
                    Third Violation: Temporary Ban (7 to 90 days)
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Your account will be temporarily banned from all community features.
                    Access to read-only platform features may be preserved at our discretion.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-medium">
                    Severe Violations: Immediate Permanent Ban
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    The following offenses result in immediate permanent ban without prior warning:
                    ITAR/EAR export control violations, credible threats of violence, child sexual
                    abuse material (CSAM), and any content that constitutes a criminal offense.
                    These violations may also be reported to the appropriate law enforcement or
                    regulatory authorities.
                  </p>
                </div>
              </div>

              <p className="text-slate-400 leading-relaxed mt-4">
                Content removal may occur at any stage, independent of other enforcement actions.
                SpaceNexus reserves the right to escalate enforcement at its sole discretion based
                on the severity of the violation.
              </p>
            </section>

            {/* Appeals Process */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Appeals Process</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                If you believe an enforcement action was taken against your account in error, you
                may file an appeal:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>
                  Send your appeal to{' '}
                  <a href="mailto:community@spacenexus.us" className="text-nebula-300 hover:text-nebula-200 underline">
                    community@spacenexus.us
                  </a>{' '}
                  within 30 days of the enforcement action
                </li>
                <li>
                  Include your username, the date of the action, and a clear explanation of why
                  you believe the action was unwarranted
                </li>
                <li>
                  A SpaceNexus administrator will review your appeal and respond within 5 business
                  days
                </li>
                <li>
                  The administrator&apos;s decision on the appeal is final
                </li>
              </ul>
            </section>

            {/* Reporting */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Reporting Violations</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                If you encounter content or behavior that violates these guidelines, please report
                it promptly. Timely reporting helps us maintain a safe and professional community.
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>
                  Use the <strong>Report</strong> button available on all posts, messages, and
                  user profiles to flag content for review
                </li>
                <li>
                  For urgent matters or issues not covered by the report button, email{' '}
                  <a href="mailto:community@spacenexus.us" className="text-nebula-300 hover:text-nebula-200 underline">
                    community@spacenexus.us
                  </a>
                </li>
                <li>
                  All reports are treated as confidential. The identity of the reporter will not
                  be disclosed to the reported party except where required by law
                </li>
                <li>
                  Filing false or malicious reports is itself a violation of these guidelines and
                  may result in enforcement action against the reporter
                </li>
              </ul>
            </section>

            {/* Related Documents */}
            <section className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Related Documents</h3>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/terms"
                  className="text-nebula-300 hover:text-nebula-200 underline"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="text-nebula-300 hover:text-nebula-200 underline"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/legal/dmca"
                  className="text-nebula-300 hover:text-nebula-200 underline"
                >
                  DMCA &amp; Copyright Policy
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
