import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Accessibility Statement',
  description: 'SpaceNexus is committed to ensuring digital accessibility for people with disabilities. Learn about our WCAG 2.1 AA compliance efforts and how to report accessibility issues.',
  alternates: { canonical: 'https://spacenexus.us/accessibility' },
};

export const revalidate = 86400; // ISR: revalidate every 24 hours

export default function AccessibilityStatementPage() {
  const lastUpdated = 'March 21, 2026';

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Accessibility Statement"
          subtitle="Our commitment to an inclusive experience for all users"
          icon="♿"
          accentColor="amber"
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            Back to Home
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
          <div className="card p-8 space-y-8">
            <p className="text-slate-400 text-sm">Last Updated: {lastUpdated}</p>

            {/* Commitment */}
            <section>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">Our Commitment</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus is committed to ensuring digital accessibility for people with disabilities.
                We continually improve the user experience for everyone and apply the relevant accessibility
                standards to make our platform usable by the widest possible audience, regardless of ability
                or technology.
              </p>
              <p className="text-slate-400 leading-relaxed">
                We believe that space industry intelligence should be accessible to all professionals,
                researchers, and enthusiasts. Accessibility is not an afterthought at SpaceNexus &mdash;
                it is a core part of how we design and build our platform.
              </p>
            </section>

            {/* Standards */}
            <section>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">Standards We Follow</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus strives to conform to the{' '}
                <strong className="text-white/90">Web Content Accessibility Guidelines (WCAG) 2.1, Level AA</strong>.
                These guidelines are published by the World Wide Web Consortium (W3C) and define how to make
                web content more accessible to people with disabilities. Conformance at Level AA addresses
                the most common barriers for users with visual, auditory, motor, and cognitive disabilities.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                We also reference the following standards and best practices:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>WAI-ARIA (Accessible Rich Internet Applications) for dynamic content and interactive components</li>
                <li>Section 508 of the Rehabilitation Act (U.S. federal accessibility requirements)</li>
                <li>EN 301 549 (European accessibility standard for ICT products and services)</li>
                <li>ATAG 2.0 (Authoring Tool Accessibility Guidelines) for user-generated content features</li>
              </ul>
            </section>

            {/* Measures Taken */}
            <section>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">Accessibility Measures</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus takes the following measures to ensure accessibility:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Include accessibility as part of our design system and internal development guidelines</li>
                <li>Provide ongoing accessibility training for our design and engineering teams</li>
                <li>Assign clear accessibility goals and responsibilities across teams</li>
                <li>Use semantic HTML throughout the platform for proper document structure</li>
                <li>Ensure sufficient color contrast ratios that meet or exceed WCAG AA thresholds</li>
                <li>Provide text alternatives for non-text content, including images, charts, and icons</li>
                <li>Support full keyboard navigation across all interactive elements</li>
                <li>Implement ARIA landmarks, labels, and live regions for screen reader compatibility</li>
                <li>Ensure forms include associated labels, clear error messages, and input instructions</li>
                <li>Maintain visible focus indicators for keyboard users</li>
                <li>Avoid content that flashes more than three times per second</li>
                <li>Design responsive layouts that work across a range of screen sizes and zoom levels up to 200%</li>
              </ul>
            </section>

            {/* Testing Approach */}
            <section>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">Testing Approach</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                We evaluate the accessibility of SpaceNexus through a combination of automated and manual
                testing methods:
              </p>

              <h3 className="text-lg font-medium text-white/90 mb-3">Automated Testing</h3>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4 mb-4">
                <li>Axe-core automated accessibility scans integrated into our CI/CD pipeline</li>
                <li>Lighthouse accessibility audits run on every production build</li>
                <li>ESLint jsx-a11y plugin to catch common accessibility issues during development</li>
                <li>Automated color contrast checks across all theme variants</li>
              </ul>

              <h3 className="text-lg font-medium text-white/90 mb-3">Manual Testing</h3>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4 mb-4">
                <li>Keyboard-only navigation testing across all major user flows</li>
                <li>Screen reader testing with NVDA (Windows), VoiceOver (macOS/iOS), and TalkBack (Android)</li>
                <li>High contrast mode and forced colors testing</li>
                <li>Browser zoom testing at 200% and 400% magnification</li>
                <li>Testing with various assistive technologies including voice recognition software</li>
              </ul>

              <h3 className="text-lg font-medium text-white/90 mb-3">Review Cadence</h3>
              <p className="text-slate-400 leading-relaxed">
                We perform comprehensive accessibility audits on a quarterly basis and conduct targeted
                reviews whenever significant new features or interface changes are introduced. Critical
                accessibility issues are treated with the same priority as security vulnerabilities.
              </p>
            </section>

            {/* Known Limitations */}
            <section>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">Known Limitations</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                While we strive for full WCAG 2.1 AA conformance, we are aware of the following areas
                where we are actively working to improve accessibility:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>
                  <strong className="text-white/90">Interactive data visualizations:</strong> Some complex charts
                  and orbital maps may not be fully accessible to screen readers. We provide data tables as
                  alternative representations where possible and are working to expand this coverage.
                </li>
                <li>
                  <strong className="text-white/90">Real-time event feeds:</strong> Live update streams
                  (such as launch telemetry and space weather alerts) may not always announce changes to
                  assistive technologies in a timely manner. We are implementing ARIA live regions to address this.
                </li>
                <li>
                  <strong className="text-white/90">Third-party embedded content:</strong> Some externally
                  embedded content (such as video players and social media widgets) may not fully meet our
                  accessibility standards. We work with vendors to improve this and provide alternative
                  access to the same information where feasible.
                </li>
                <li>
                  <strong className="text-white/90">PDF reports:</strong> Some downloadable PDF reports may
                  have limited accessibility. We are working toward providing accessible HTML versions of
                  all report content.
                </li>
              </ul>
            </section>

            {/* Assistive Technology Compatibility */}
            <section>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">Assistive Technology Compatibility</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus is designed to be compatible with the following assistive technologies:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>Screen readers: NVDA, JAWS, VoiceOver, TalkBack</li>
                <li>Screen magnification software</li>
                <li>Speech recognition software (e.g., Dragon NaturallySpeaking)</li>
                <li>Keyboard-only navigation</li>
                <li>Switch access devices</li>
                <li>Operating system accessibility features (high contrast, reduced motion, large text)</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mt-4">
                We support the current and previous two major versions of Chrome, Firefox, Safari, and Edge.
                The platform respects the <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-sm text-white/70">prefers-reduced-motion</code> and{' '}
                <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-sm text-white/70">prefers-contrast</code> media
                queries for users who have configured these preferences in their operating system.
              </p>
            </section>

            {/* Feedback */}
            <section>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">Feedback and Contact</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                We welcome your feedback on the accessibility of SpaceNexus. If you encounter any
                accessibility barriers or have suggestions for improvement, please let us know:
              </p>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-6 mb-4">
                <p className="text-white/70 font-medium">SpaceNexus Accessibility Team</p>
                <p className="text-slate-400 mt-2">Email: accessibility@spacenexus.us</p>
                <p className="text-slate-400">Address: 1234 Orbit Drive, Suite 500, Houston, TX 77058</p>
                <p className="text-slate-400 mt-3">
                  Or reach us through our{' '}
                  <Link href="/contact" className="text-white/90 hover:text-white underline">
                    Contact Page
                  </Link>
                </p>
              </div>
              <p className="text-slate-400 leading-relaxed mb-4">
                When reporting an accessibility issue, please include:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
                <li>The URL (web address) of the page where you encountered the issue</li>
                <li>A description of the problem and what you expected to happen</li>
                <li>The assistive technology you were using (if any), including its version</li>
                <li>Your browser and operating system</li>
              </ul>
              <p className="text-slate-400 leading-relaxed mt-4">
                We aim to respond to accessibility feedback within two business days and to resolve
                reported issues within 30 days. If a fix requires more time, we will provide a
                timeline and, where possible, an interim workaround.
              </p>
            </section>

            {/* Enforcement */}
            <section>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-4">Enforcement Procedure</h2>
              <p className="text-slate-400 leading-relaxed">
                If you are not satisfied with our response to your accessibility concern, you may
                escalate the matter by contacting us at accessibility@spacenexus.us with the subject
                line &quot;Accessibility Escalation.&quot; Our leadership team will review the issue
                and respond within five business days.
              </p>
            </section>

            {/* Related Links */}
            <section className="pt-6 border-t border-white/[0.08]">
              <h3 className="text-lg font-medium text-white/90 mb-4">Related Documents</h3>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/privacy"
                  className="text-white/90 hover:text-white underline"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-white/90 hover:text-white underline"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/contact"
                  className="text-white/90 hover:text-white underline"
                >
                  Contact Us
                </Link>
                <Link
                  href="/community/guidelines"
                  className="text-white/90 hover:text-white underline"
                >
                  Community Guidelines
                </Link>
              </div>
            </section>
          </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
