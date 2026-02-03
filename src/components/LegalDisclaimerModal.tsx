'use client';

import Modal from '@/components/ui/Modal';

export const LEGAL_DISCLAIMER_SECTIONS = [
  {
    title: '1. No Attorney-Client Relationship',
    body: 'The information provided on Space Nexus (the "Site"), including but not limited to news, articles, regulatory updates, and discussions of legal issues, is for general informational purposes only. Your use of this Site, and the transmission or receipt of any information from this Site, does not create or constitute an attorney-client relationship between you and Space Nexus, its owners, authors, or any affiliated legal professionals.\n\nNo attorney-client relationship is formed until you have established a formal, written, and signed engagement agreement with an attorney. Consequently, any communication sent to us via this Site, email, or social media may not be treated as privileged or confidential. Please do not send sensitive or confidential information through this Site.',
  },
  {
    title: '2. Not Legal Advice',
    body: 'The content on Space Nexus is intended to provide a general overview and discussion of regulatory and legal developments; it is not intended to be, and should not be used as, a substitute for legal advice. Legal and regulatory issues are highly fact-specific and subject to the laws of particular jurisdictions. The information provided here may not apply to your specific situation or jurisdiction. You should not act, or refrain from acting, based on any information on this Site without first seeking professional legal counsel licensed in your state or country.',
  },
  {
    title: '3. Accuracy, Timeliness, and No Warranty',
    body: 'While we strive to provide high-quality information, the legal and regulatory landscape is subject to rapid and constant change. Space Nexus does not represent, warrant, or guarantee that the information on this Site is accurate, complete, current, or free from errors or omissions.\n\nAll content is provided on an "as is" and "as available" basis, without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We disclaim all liability for any actions taken or not taken based on the contents of this Site.',
  },
  {
    title: '4. No Reliance and Assumption of Risk',
    body: 'You should not rely upon the information on this Site. Any reliance you place on such information is strictly at your own risk. It is your responsibility to independently verify any information provided on Space Nexus before making any decisions or taking any actions. Under no circumstances shall Space Nexus or its affiliates be liable for any direct, indirect, incidental, or consequential damages resulting from your use of this Site or your reliance on its content.',
  },
  {
    title: '5. Third-Party Content and External Links',
    body: 'Space Nexus may aggregate news or provide links to third-party websites for your convenience. Such links do not constitute an endorsement, recommendation, or verification of the content on those sites. Space Nexus has no control over, and assumes no responsibility for, the accuracy, legality, or availability of third-party information or external resources.',
  },
  {
    title: '6. Jurisdictional Limitations',
    body: 'Space Nexus is based in the United States and is not intended to solicit clients or provide information in any jurisdiction where the Site would fail to comply with all applicable laws and ethical rules.',
  },
];

interface LegalDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalDisclaimerModal({ isOpen, onClose }: LegalDisclaimerModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Legal Disclaimer for Space Nexus">
      <div className="space-y-5">
        {LEGAL_DISCLAIMER_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-white mb-2">{section.title}</h3>
            <p className="text-star-300 text-sm whitespace-pre-line leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
