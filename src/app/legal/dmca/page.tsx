import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export const metadata = {
  title: 'DMCA & Copyright Policy | SpaceNexus',
  description: 'SpaceNexus DMCA and copyright policy. Learn how to file a takedown notice, counter-notice, and our compliance with the TAKE IT DOWN Act.',
};

export const revalidate = 86400;

export default function DMCAPage() {
  const lastUpdated = 'February 21, 2026';

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <PageHeader
          title="DMCA & Copyright Policy"
          subtitle="Our process for handling copyright infringement claims"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Legal' },
            { label: 'DMCA & Copyright Policy' },
          ]}
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
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus, LLC (&quot;SpaceNexus,&quot; &quot;we,&quot; &quot;us,&quot; or
                &quot;our&quot;) respects the intellectual property rights of others and expects
                our users to do the same. In accordance with the Digital Millennium Copyright Act
                of 1998 (17 U.S.C. Section 512) (&quot;DMCA&quot;), we will respond expeditiously
                to claims of copyright infringement committed using our platform if such claims
                are reported to our designated copyright agent identified below.
              </p>
              <p className="text-slate-400 leading-relaxed">
                This policy applies to all content hosted on SpaceNexus, including community forum
                posts, marketplace listings, company profiles, user comments, and any other
                user-generated content.
              </p>
            </section>

            {/* Designated Agent */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Designated Copyright Agent</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Our designated agent for receiving notifications of claimed copyright infringement
                is:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <p className="text-slate-700 font-medium">SpaceNexus DMCA Agent</p>
                <p className="text-slate-400 mt-2">
                  Email:{' '}
                  <a href="mailto:dmca@spacenexus.us" className="text-nebula-300 hover:text-nebula-200 underline">
                    dmca@spacenexus.us
                  </a>
                </p>
                <p className="text-slate-400">
                  Mailing Address: SpaceNexus LLC, Houston, TX 77058
                </p>
              </div>
            </section>

            {/* Filing a DMCA Takedown Notice */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Filing a DMCA Takedown Notice
              </h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                If you believe that content hosted on SpaceNexus infringes your copyright, you may
                submit a written notification to our designated agent. To be effective, your
                notification must be a written communication that includes the following elements
                as required by 17 U.S.C. Section 512(c)(3):
              </p>
              <ol className="list-decimal list-inside text-slate-400 space-y-3 ml-4">
                <li>
                  <strong>Signature:</strong> A physical or electronic signature of the copyright
                  owner or a person authorized to act on behalf of the owner of an exclusive right
                  that is allegedly infringed.
                </li>
                <li>
                  <strong>Identification of copyrighted work:</strong> Identification of the
                  copyrighted work claimed to have been infringed, or if multiple copyrighted works
                  at a single online site are covered by a single notification, a representative
                  list of such works at that site.
                </li>
                <li>
                  <strong>Identification of infringing material:</strong> Identification of the
                  material that is claimed to be infringing or to be the subject of infringing
                  activity and that is to be removed or access to which is to be disabled, and
                  information reasonably sufficient to permit SpaceNexus to locate the material
                  (e.g., the URL of the page containing the material).
                </li>
                <li>
                  <strong>Contact information:</strong> Information reasonably sufficient to permit
                  SpaceNexus to contact you, including your name, mailing address, telephone
                  number, and email address.
                </li>
                <li>
                  <strong>Good faith statement:</strong> A statement that you have a good faith
                  belief that use of the material in the manner complained of is not authorized
                  by the copyright owner, its agent, or the law.
                </li>
                <li>
                  <strong>Accuracy and authority statement:</strong> A statement that the
                  information in the notification is accurate, and under penalty of perjury, that
                  you are the copyright owner or authorized to act on behalf of the owner of an
                  exclusive right that is allegedly infringed.
                </li>
              </ol>
              <p className="text-slate-400 leading-relaxed mt-4">
                Send your completed takedown notice to{' '}
                <a href="mailto:dmca@spacenexus.us" className="text-nebula-300 hover:text-nebula-200 underline">
                  dmca@spacenexus.us
                </a>. Notices that do not substantially comply with all six requirements above may
                not receive a response.
              </p>
            </section>

            {/* Counter-Notice Process */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Counter-Notice Process</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                If you believe that material you posted on SpaceNexus was removed or disabled as a
                result of a mistake or misidentification, you may submit a written counter-notice
                to our designated agent. Your counter-notice must include:
              </p>
              <ol className="list-decimal list-inside text-slate-400 space-y-3 ml-4">
                <li>
                  <strong>Signature:</strong> Your physical or electronic signature.
                </li>
                <li>
                  <strong>Identification of removed material:</strong> Identification of the
                  material that has been removed or to which access has been disabled and the
                  location at which the material appeared before it was removed or disabled (e.g.,
                  the URL).
                </li>
                <li>
                  <strong>Statement under penalty of perjury:</strong> A statement under penalty
                  of perjury that you have a good faith belief that the material was removed or
                  disabled as a result of mistake or misidentification of the material to be
                  removed or disabled.
                </li>
                <li>
                  <strong>Consent to jurisdiction:</strong> Your name, address, and telephone
                  number, and a statement that you consent to the jurisdiction of the federal
                  district court for the judicial district in which your address is located (or
                  if you are outside the United States, the Southern District of Texas), and that
                  you will accept service of process from the person who provided the original
                  DMCA notification or an agent of such person.
                </li>
              </ol>
              <p className="text-slate-400 leading-relaxed mt-4">
                Send your counter-notice to{' '}
                <a href="mailto:dmca@spacenexus.us" className="text-nebula-300 hover:text-nebula-200 underline">
                  dmca@spacenexus.us
                </a>.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                <p className="text-slate-700 font-medium mb-2">Restoration Timeline</p>
                <p className="text-slate-400 text-sm">
                  Upon receipt of a valid counter-notice, SpaceNexus will forward it to the
                  original complaining party. If the copyright holder does not file a court action
                  seeking an order against you within 10 business days, we will restore the removed
                  material within 10 to 14 business days after receiving the counter-notice.
                </p>
              </div>
            </section>

            {/* Repeat Infringer Policy */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Repeat Infringer Policy</h2>
              <p className="text-slate-400 leading-relaxed">
                In accordance with the DMCA, SpaceNexus has adopted a policy of terminating, in
                appropriate circumstances, the accounts of users who are deemed to be repeat
                infringers. Accounts that accumulate three (3) or more valid DMCA strikes will be
                permanently terminated. SpaceNexus may also, at its sole discretion, limit access
                to the platform or terminate the accounts of any users who infringe the intellectual
                property rights of others, regardless of the number of prior strikes.
              </p>
            </section>

            {/* TAKE IT DOWN Act Compliance */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                TAKE IT DOWN Act Compliance
              </h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus complies with the TAKE IT DOWN Act (signed into law on May 19, 2025),
                which establishes federal requirements for the removal of non-consensual intimate
                images (NCII), including AI-generated deepfakes.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-3">
                <h3 className="text-lg font-medium text-slate-800">
                  Reporting Non-Consensual Intimate Images
                </h3>
                <ul className="list-disc list-inside text-slate-400 space-y-2 ml-2">
                  <li>
                    If you are a victim or an authorized representative, you may request the
                    removal of non-consensual intimate images by contacting{' '}
                    <a href="mailto:takedown@spacenexus.us" className="text-nebula-300 hover:text-nebula-200 underline">
                      takedown@spacenexus.us
                    </a>
                  </li>
                  <li>
                    Include your name (or the name of the person depicted), a description or
                    URL of the content, and a statement that the depicted individual did not
                    consent to the distribution of the image
                  </li>
                  <li>
                    SpaceNexus is committed to removing confirmed NCII content within 48 hours
                    of receiving a valid request
                  </li>
                  <li>
                    We will also take reasonable steps to prevent re-uploading of the same or
                    substantially similar content
                  </li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <p className="text-red-700 font-medium text-sm">
                  Warning: Knowingly filing a false NCII removal request is a federal crime
                  under the TAKE IT DOWN Act and may result in criminal prosecution.
                </p>
              </div>
            </section>

            {/* Good Faith Warning */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Good Faith Warning</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <p className="text-amber-900 leading-relaxed">
                  Please be advised that under 17 U.S.C. Section 512(f), any person who knowingly
                  materially misrepresents that material or activity is infringing, or that material
                  or activity was removed or disabled by mistake or misidentification, may be
                  subject to liability for damages, including costs and attorneys&apos; fees, incurred
                  by the alleged infringer, by any copyright owner or copyright owner&apos;s authorized
                  licensee, or by SpaceNexus. Before filing a DMCA notice or counter-notice, you
                  may wish to consult with an attorney to understand your rights and obligations
                  under the DMCA.
                </p>
              </div>
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
                  href="/community/guidelines"
                  className="text-nebula-300 hover:text-nebula-200 underline"
                >
                  Community Guidelines
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
