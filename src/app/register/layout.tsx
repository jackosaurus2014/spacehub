import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a free SpaceNexus account to access space industry intelligence, real-time data, market analysis, and professional networking tools.',
  alternates: { canonical: 'https://spacenexus.us/register' },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Google Ads Conversion Tracking (Registration Completion)
          Replace AW-XXXXXXXXX/CONVERSION_LABEL with your Google Ads conversion ID and label.
          <script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX" />
          <script dangerouslySetInnerHTML={{ __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('config', 'AW-XXXXXXXXX');
          `}} />
      */}

      {/* LinkedIn Insight Tag
          Replace PARTNER_ID with your LinkedIn partner ID.
          <script dangerouslySetInnerHTML={{ __html: `
            _linkedin_partner_id = "PARTNER_ID";
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          `}} />
      */}

      {children}
    </>
  );
}
