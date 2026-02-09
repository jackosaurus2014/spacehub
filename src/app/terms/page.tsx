import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export default function TermsOfServicePage() {
  const lastUpdated = 'February 5, 2026';

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <PageHeader
          title="Terms of Service"
          subtitle="Please read these terms carefully before using our services"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Terms of Service' }]}
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            Back to Home
          </Link>
        </PageHeader>

        <div className="max-w-4xl mx-auto">
          <div className="card p-8 space-y-8">
            <p className="text-slate-400 text-sm">Last Updated: {lastUpdated}</p>

            {/* Acceptance */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Welcome to SpaceNexus. By accessing or using our website, mobile applications, APIs, or any
                other services we offer (collectively, the &quot;Services&quot;), you agree to be bound by these
                Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use
                the Services.
              </p>
              <p className="text-slate-400 leading-relaxed">
                These Terms constitute a legally binding agreement between you and SpaceNexus, LLC.
                (&quot;SpaceNexus,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By using our Services, you represent that you are
                at least 18 years old and have the legal capacity to enter into these Terms.
              </p>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Description of Services</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus provides a platform for space industry intelligence, data analytics, and market
                information. Our Services include, but are not limited to:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Real-time space mission tracking and launch information</li>
                <li>Market intelligence and industry analysis</li>
                <li>Regulatory compliance tools and resources</li>
                <li>Space news aggregation and curation</li>
                <li>Solar system exploration data and visualizations</li>
                <li>Business opportunity listings and workforce resources</li>
                <li>Newsletter and communication services</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mt-4">
                We reserve the right to modify, suspend, or discontinue any aspect of the Services at any
                time without prior notice.
              </p>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. User Accounts</h2>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Account Registration</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                To access certain features of our Services, you may be required to create an account.
                When registering, you agree to provide accurate, current, and complete information and to
                update such information to keep it accurate, current, and complete.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Account Security</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                You are responsible for safeguarding your account credentials and for all activities that
                occur under your account. You agree to notify us immediately of any unauthorized use of
                your account or any other breach of security.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Account Termination</h3>
              <p className="text-slate-400 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for any reason,
                including if we reasonably believe that you have violated these Terms.
              </p>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Acceptable Use Policy</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                You agree to use the Services only for lawful purposes and in accordance with these Terms.
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Use the Services in any way that violates any applicable law or regulation</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Engage in any conduct that restricts or inhibits anyone&apos;s use of the Services</li>
                <li>Attempt to gain unauthorized access to any portion of the Services or any systems</li>
                <li>Use any robot, spider, scraper, or other automated means to access the Services</li>
                <li>Introduce any viruses, malware, or other harmful code</li>
                <li>Interfere with or disrupt the integrity or performance of the Services</li>
                <li>Collect or harvest any personally identifiable information from other users</li>
                <li>Use the Services for any commercial purpose without our prior written consent</li>
                <li>Reverse engineer, decompile, or disassemble any aspect of the Services</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Intellectual Property Rights</h2>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Our Content</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                The Services and their entire contents, features, and functionality (including but not
                limited to all information, software, text, displays, images, video, audio, and the design,
                selection, and arrangement thereof) are owned by SpaceNexus, its licensors, or other providers
                and are protected by copyright, trademark, patent, trade secret, and other intellectual
                property laws.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Limited License</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
                non-transferable, revocable license to access and use the Services for your personal or
                internal business purposes.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">User Content</h3>
              <p className="text-slate-400 leading-relaxed">
                By submitting content to our Services (such as feature requests, comments, or feedback),
                you grant us a worldwide, royalty-free, perpetual, irrevocable license to use, reproduce,
                modify, publish, and distribute such content in connection with the Services.
              </p>
            </section>

            {/* Third-Party Content */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Third-Party Content and Services</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Our Services may contain links to third-party websites, services, or content that are not
                owned or controlled by SpaceNexus. We have no control over and assume no responsibility for
                the content, privacy policies, or practices of any third-party websites or services.
              </p>
              <p className="text-slate-400 leading-relaxed">
                We use data from various third-party sources, including the Spaceflight News API and other
                public data sources. We make no representations or warranties regarding the accuracy,
                completeness, or reliability of such third-party data.
              </p>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Disclaimers</h2>
              <p className="text-slate-400 leading-relaxed mb-4 uppercase font-medium">
                THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT ANY WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                To the fullest extent permitted by law, we disclaim all warranties, express or implied,
                including but not limited to implied warranties of merchantability, fitness for a particular
                purpose, and non-infringement. We do not warrant that:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>The Services will be uninterrupted, timely, secure, or error-free</li>
                <li>The results obtained from the Services will be accurate or reliable</li>
                <li>The quality of any information obtained through the Services will meet your expectations</li>
                <li>Any errors in the Services will be corrected</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mt-4">
                The information provided through our Services is for general informational purposes only
                and should not be relied upon for making business, legal, or investment decisions without
                independent verification and professional advice.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-slate-400 leading-relaxed mb-4 uppercase font-medium">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SPACENEXUS, ITS
                AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                This includes, without limitation, damages for loss of profits, goodwill, use, data, or
                other intangible losses resulting from:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Your access to or use of or inability to access or use the Services</li>
                <li>Any conduct or content of any third party on the Services</li>
                <li>Any content obtained from the Services</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mt-4">
                In no event shall our total liability to you for all claims exceed the amount you paid to
                us, if any, for accessing the Services during the twelve (12) months preceding the claim.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Indemnification</h2>
              <p className="text-slate-400 leading-relaxed">
                You agree to defend, indemnify, and hold harmless SpaceNexus and its affiliates, officers,
                directors, employees, and agents from and against any claims, liabilities, damages,
                judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees)
                arising out of or relating to your violation of these Terms or your use of the Services.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Changes to Terms</h2>
              <p className="text-slate-400 leading-relaxed">
                We reserve the right to modify these Terms at any time. If we make material changes, we
                will notify you by posting the updated Terms on our website and updating the &quot;Last Updated&quot;
                date. Your continued use of the Services after any such changes constitutes your acceptance
                of the new Terms. If you do not agree to the new Terms, you must stop using the Services.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Governing Law and Jurisdiction</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the State of
                Texas, United States, without regard to its conflict of law provisions.
              </p>
              <p className="text-slate-400 leading-relaxed">
                Any legal action or proceeding arising out of or relating to these Terms or the Services
                shall be brought exclusively in the federal or state courts located in Harris County, Texas,
                and you consent to the personal jurisdiction of such courts.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">12. Dispute Resolution</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Any dispute arising from these Terms or your use of the Services shall first be attempted
                to be resolved through good-faith negotiations. If such negotiations fail, the dispute shall
                be resolved through binding arbitration administered by the American Arbitration Association
                in accordance with its Commercial Arbitration Rules.
              </p>
              <p className="text-slate-400 leading-relaxed">
                You agree that any arbitration or court proceeding shall be conducted on an individual basis
                and not in a class, consolidated, or representative action.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">13. Severability</h2>
              <p className="text-slate-400 leading-relaxed">
                If any provision of these Terms is held to be invalid or unenforceable, such provision shall
                be struck and the remaining provisions shall be enforced to the fullest extent under law.
              </p>
            </section>

            {/* Entire Agreement */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">14. Entire Agreement</h2>
              <p className="text-slate-400 leading-relaxed">
                These Terms, together with our Privacy Policy and any other agreements expressly incorporated
                by reference herein, constitute the entire agreement between you and SpaceNexus concerning
                the Services and supersede all prior or contemporaneous communications and proposals.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">15. Contact Information</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <p className="text-slate-700 font-medium">SpaceNexus Legal Team</p>
                <p className="text-slate-400 mt-2">Email: legal@spacenexus.com</p>
                <p className="text-slate-400">Address: 1234 Orbit Drive, Suite 500, Houston, TX 77058</p>
              </div>
            </section>

            {/* Related Links */}
            <section className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Related Documents</h3>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/privacy"
                  className="text-nebula-300 hover:text-nebula-200 underline"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/cookies"
                  className="text-nebula-300 hover:text-nebula-200 underline"
                >
                  Cookie Policy
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
