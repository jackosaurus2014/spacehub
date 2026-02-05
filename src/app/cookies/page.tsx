import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export default function CookiePolicyPage() {
  const lastUpdated = 'February 5, 2026';

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <PageHeader
          title="Cookie Policy"
          subtitle="How we use cookies and similar technologies"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Cookie Policy' }]}
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            Back to Home
          </Link>
        </PageHeader>

        <div className="max-w-4xl mx-auto">
          <div className="card p-8 space-y-8">
            <p className="text-slate-500 text-sm">Last Updated: {lastUpdated}</p>

            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">What Are Cookies?</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Cookies are small text files that are placed on your computer or mobile device when you
                visit a website. They are widely used to make websites work more efficiently, provide a
                better user experience, and give website owners information about how their site is being used.
              </p>
              <p className="text-slate-600 leading-relaxed">
                This Cookie Policy explains what cookies are, how SpaceNexus uses them, the types of cookies
                we use, and how you can manage your cookie preferences.
              </p>
            </section>

            {/* How We Use Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">How SpaceNexus Uses Cookies</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We use cookies and similar tracking technologies for various purposes, including:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Enabling core functionality and security features</li>
                <li>Remembering your preferences and settings</li>
                <li>Understanding how you use our platform</li>
                <li>Improving our services based on usage patterns</li>
                <li>Providing personalized content and recommendations</li>
                <li>Measuring the effectiveness of our communications</li>
              </ul>
            </section>

            {/* Types of Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Types of Cookies We Use</h2>

              {/* Essential Cookies */}
              <div className="mb-6 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <h3 className="text-lg font-medium text-slate-800">Essential Cookies</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Required</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-3">
                  These cookies are necessary for the website to function properly. They enable basic
                  functions like page navigation, secure areas access, and remembering your login status.
                  The website cannot function properly without these cookies.
                </p>
                <div className="text-sm text-slate-500">
                  <p className="font-medium mb-1">Examples:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Session cookies for authentication</li>
                    <li>Security cookies to prevent fraud</li>
                    <li>Load balancing cookies for performance</li>
                  </ul>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="mb-6 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <h3 className="text-lg font-medium text-slate-800">Functional Cookies</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Preferences</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-3">
                  These cookies enable the website to provide enhanced functionality and personalization.
                  They may be set by us or by third-party providers whose services we have added to our pages.
                </p>
                <div className="text-sm text-slate-500">
                  <p className="font-medium mb-1">Examples:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Language and region preferences</li>
                    <li>Theme settings (dark/light mode)</li>
                    <li>Recently viewed items</li>
                    <li>User interface customizations</li>
                  </ul>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="mb-6 p-6 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <h3 className="text-lg font-medium text-slate-800">Analytics Cookies</h3>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Performance</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-3">
                  These cookies help us understand how visitors interact with our website by collecting
                  and reporting information anonymously. This helps us improve the way our website works.
                </p>
                <div className="text-sm text-slate-500">
                  <p className="font-medium mb-1">Information collected:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Pages visited and time spent on each page</li>
                    <li>Links clicked and features used</li>
                    <li>Error messages encountered</li>
                    <li>Browser and device information</li>
                  </ul>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <h3 className="text-lg font-medium text-slate-800">Marketing Cookies</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Advertising</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-3">
                  These cookies may be set through our site by our advertising partners. They may be used
                  to build a profile of your interests and show you relevant advertisements on other sites.
                </p>
                <div className="text-sm text-slate-500">
                  <p className="font-medium mb-1">Purposes:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Measuring advertising effectiveness</li>
                    <li>Limiting how often you see an ad</li>
                    <li>Personalizing content recommendations</li>
                    <li>Tracking conversions from marketing campaigns</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Cookie Duration */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Cookie Duration</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Cookies can remain on your device for different periods of time:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-800 mb-2">Session Cookies</h4>
                  <p className="text-sm text-slate-600">
                    These are temporary cookies that expire when you close your browser. They are used
                    to maintain your session while you navigate the site.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-800 mb-2">Persistent Cookies</h4>
                  <p className="text-sm text-slate-600">
                    These cookies remain on your device for a set period or until you delete them. They
                    are used to remember your preferences across visits.
                  </p>
                </div>
              </div>
            </section>

            {/* Third-Party Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Third-Party Cookies</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report
                usage statistics, deliver advertisements, and provide other services. These third parties
                may include:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                <li><strong>Analytics providers:</strong> To help us understand how visitors use our site</li>
                <li><strong>Advertising networks:</strong> To deliver relevant advertisements</li>
                <li><strong>Social media platforms:</strong> To enable sharing functionality</li>
                <li><strong>Payment processors:</strong> To process transactions securely</li>
                <li><strong>Customer support tools:</strong> To provide live chat and support features</li>
              </ul>
              <p className="text-slate-600 leading-relaxed">
                These third parties have their own privacy policies addressing how they use information.
                We encourage you to read their privacy policies to understand their practices.
              </p>
            </section>

            {/* Managing Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">How to Manage Cookies</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                You have several options to control or limit how cookies are used:
              </p>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Browser Settings</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Most web browsers allow you to control cookies through their settings. You can typically
                find these settings in the &quot;Options&quot; or &quot;Preferences&quot; menu of your browser. The following
                links provide information about cookie settings in common browsers:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-6">
                <li>
                  <a href="https://support.google.com/chrome/answer/95647"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-nebula-500 hover:text-nebula-400 underline">
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-nebula-500 hover:text-nebula-400 underline">
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-nebula-500 hover:text-nebula-400 underline">
                    Safari
                  </a>
                </li>
                <li>
                  <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-nebula-500 hover:text-nebula-400 underline">
                    Microsoft Edge
                  </a>
                </li>
              </ul>

              <h3 className="text-lg font-medium text-slate-800 mb-3">Opt-Out Tools</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                You can opt out of certain third-party cookies using these tools:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-6">
                <li>
                  <a href="https://optout.networkadvertising.org/"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-nebula-500 hover:text-nebula-400 underline">
                    Network Advertising Initiative Opt-Out
                  </a>
                </li>
                <li>
                  <a href="https://optout.aboutads.info/"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-nebula-500 hover:text-nebula-400 underline">
                    Digital Advertising Alliance Opt-Out
                  </a>
                </li>
                <li>
                  <a href="https://www.youronlinechoices.eu/"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-nebula-500 hover:text-nebula-400 underline">
                    European Interactive Digital Advertising Alliance
                  </a>
                </li>
              </ul>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> Disabling cookies may affect your experience on our website.
                  Some features may not function properly if cookies are disabled.
                </p>
              </div>
            </section>

            {/* Do Not Track */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Do Not Track Signals</h2>
              <p className="text-slate-600 leading-relaxed">
                Some browsers include a &quot;Do Not Track&quot; (DNT) feature that signals to websites that you
                do not want your online activity tracked. Currently, there is no uniform standard for
                handling DNT signals, and our website does not currently respond to DNT signals. However,
                you can manage your cookie preferences using the methods described above.
              </p>
            </section>

            {/* Updates */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Updates to This Policy</h2>
              <p className="text-slate-600 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or
                for other operational, legal, or regulatory reasons. We will notify you of any material
                changes by posting the updated policy on our website with a new &quot;Last Updated&quot; date. We
                encourage you to review this policy periodically.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact Us</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <p className="text-slate-700 font-medium">SpaceNexus Privacy Team</p>
                <p className="text-slate-600 mt-2">Email: privacy@spacenexus.com</p>
                <p className="text-slate-600">Address: 1234 Orbit Drive, Suite 500, Houston, TX 77058</p>
              </div>
            </section>

            {/* Related Links */}
            <section className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Related Documents</h3>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/privacy"
                  className="text-nebula-500 hover:text-nebula-400 underline"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-nebula-500 hover:text-nebula-400 underline"
                >
                  Terms of Service
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
