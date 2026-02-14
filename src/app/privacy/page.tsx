import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export const revalidate = 86400; // ISR: revalidate every 24 hours

export default function PrivacyPolicyPage() {
  const lastUpdated = 'February 5, 2026';

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <PageHeader
          title="Privacy Policy"
          subtitle="How we collect, use, and protect your information"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]}
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            Back to Home
          </Link>
        </PageHeader>

        <div className="max-w-4xl mx-auto">
          <div className="card p-8 space-y-8">
            <p className="text-slate-400 text-sm">Last Updated: {lastUpdated}</p>

            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Introduction</h2>
              <p className="text-slate-400 leading-relaxed">
                SpaceNexus (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you visit our website and use our services. Please read this privacy policy carefully.
                If you do not agree with the terms of this privacy policy, please do not access the site.
              </p>
            </section>

            {/* Information Collection */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Information We Collect</h2>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Personal Data</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                We may collect personally identifiable information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 mb-4 ml-4">
                <li>Register for an account</li>
                <li>Subscribe to our newsletter</li>
                <li>Fill out a contact form</li>
                <li>Submit feature requests or feedback</li>
                <li>Participate in surveys or promotions</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mb-4">
                This information may include your name, email address, company name, job title, and other
                contact or identifying information you choose to provide.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Automatically Collected Data</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                When you access our platform, we automatically collect certain information, including:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Device information (browser type, operating system, device type)</li>
                <li>Log data (IP address, access times, pages viewed, referring URL)</li>
                <li>Usage patterns and feature interactions</li>
                <li>Location data (country/region based on IP address)</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-800 mb-3 mt-6">Mobile App Data</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                When you use our mobile application (iOS or Android), we may additionally collect:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Device push notification tokens (for delivering notifications you opt into)</li>
                <li>Biometric authentication verification results (we do NOT store biometric data — authentication is handled entirely by your device&apos;s secure enclave)</li>
                <li>Device model and operating system version</li>
                <li>App usage analytics and crash reports</li>
              </ul>
            </section>

            {/* Use of Data */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">How We Use Your Information</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                We use the information we collect for various purposes, including:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Providing, operating, and maintaining our services</li>
                <li>Improving, personalizing, and expanding our platform</li>
                <li>Understanding and analyzing how you use our services</li>
                <li>Developing new products, services, features, and functionality</li>
                <li>Communicating with you about updates, security alerts, and support</li>
                <li>Sending you marketing and promotional communications (with your consent)</li>
                <li>Processing transactions and managing your account</li>
                <li>Detecting, preventing, and addressing technical issues and fraud</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Information Sharing and Disclosure</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                We may share your information in the following situations:
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Service Providers</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                We may share your information with third-party service providers who perform services on our
                behalf, such as hosting, analytics, email delivery, and customer support.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Business Transfers</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                If we are involved in a merger, acquisition, or sale of assets, your information may be
                transferred as part of that transaction.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Legal Requirements</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                We may disclose your information if required to do so by law or in response to valid requests
                by public authorities (e.g., a court or government agency).
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">With Your Consent</h3>
              <p className="text-slate-400 leading-relaxed">
                We may share your information for other purposes with your explicit consent.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Cookies and Tracking Technologies</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to track activity on our platform and store
                certain information. Cookies are files with a small amount of data that may include an
                anonymous unique identifier.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                However, if you do not accept cookies, you may not be able to use some portions of our service.
              </p>
              <p className="text-slate-400 leading-relaxed">
                For more detailed information about the cookies we use, please see our{' '}
                <Link href="/cookies" className="text-nebula-300 hover:text-nebula-200 underline">
                  Cookie Policy
                </Link>.
              </p>
            </section>

            {/* Security */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Data Security</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your
                personal information against unauthorized access, alteration, disclosure, or destruction.
                These measures include:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure,
                and we cannot guarantee absolute security.
              </p>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Rights and Choices</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
                <li><strong>Restriction:</strong> Request restriction of processing your data</li>
                <li><strong>Withdrawal:</strong> Withdraw consent at any time where processing is based on consent</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mt-4">
                To exercise any of these rights, please contact us using the information provided below.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3 mt-6">Account Deletion</h3>
              <p className="text-slate-400 leading-relaxed">
                You can permanently delete your account and all associated data at any time through the{' '}
                <a href="/account" className="text-cyan-600 hover:underline">Account Settings</a> page.
                Account deletion is immediate and irreversible. All your personal data, preferences, saved
                searches, watchlists, API keys, and other account-related information will be permanently
                removed from our systems.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Data Retention</h2>
              <p className="text-slate-400 leading-relaxed">
                We retain your personal information only for as long as necessary to fulfill the purposes
                for which it was collected, including to satisfy any legal, accounting, or reporting
                requirements. When we no longer need your information, we will securely delete or anonymize it.
              </p>
            </section>

            {/* International Transfers */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">International Data Transfers</h2>
              <p className="text-slate-400 leading-relaxed">
                Your information may be transferred to and processed in countries other than your country
                of residence. These countries may have data protection laws that are different from the
                laws of your country. We take appropriate safeguards to ensure that your personal information
                remains protected in accordance with this Privacy Policy.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Children&apos;s Privacy</h2>
              <p className="text-slate-400 leading-relaxed">
                Our services are not intended for individuals under the age of 16. We do not knowingly
                collect personal information from children under 16. If you become aware that a child has
                provided us with personal information, please contact us and we will take steps to delete
                such information.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-slate-400 leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by
                posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are
                advised to review this Privacy Policy periodically for any changes. Changes to this Privacy
                Policy are effective when they are posted on this page.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact Us</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <p className="text-slate-700 font-medium">SpaceNexus Privacy Team</p>
                <p className="text-slate-400 mt-2">Email: privacy@spacenexus.us</p>
                <p className="text-slate-400">Address: 1234 Orbit Drive, Suite 500, Houston, TX 77058</p>
              </div>
            </section>

            {/* Related Links */}
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
