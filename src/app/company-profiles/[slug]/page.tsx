import CompanyProfileClient from './CompanyProfileClient';
import type { CompanyDetail } from './CompanyProfileClient';
import { getCompanyProfileData } from '@/lib/company-profile-data';
import { logger } from '@/lib/logger';

// Server-rendered profile body (2026-09-09). Until now this route shipped a
// titled shell and fetched the profile from the browser, so a slow or
// rate-limited API left an error card where 331 company pages' content
// belonged — and crawlers saw the shell. The client component still owns
// the tabs, claim flow and section fetches; it just starts with the data.
export const dynamic = 'force-dynamic';

export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let initial: CompanyDetail | null = null;
  try {
    initial = (await getCompanyProfileData(slug)) as unknown as CompanyDetail | null;
  } catch (error) {
    // Fall through to the client fetch, which renders the retry card.
    logger.warn('Server render of company profile failed; client will retry', {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return <CompanyProfileClient initialCompany={initial} />;
}
