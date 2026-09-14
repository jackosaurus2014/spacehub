import CompanyProfileClient from './CompanyProfileClient';
import type { CompanyDetail } from './CompanyProfileClient';
import { getCompanyProfileData } from '@/lib/company-profile-data';
import { logger } from '@/lib/logger';
import DiscussThis from '@/components/community/DiscussThis';

// Server-rendered profile body (2026-09-09). Until now this route shipped a
// titled shell and fetched the profile from the browser, so a slow or
// rate-limited API left an error card where 331 company pages' content
// belonged — and crawlers saw the shell. The client component still owns
// the tabs, claim flow and section fetches; it just starts with the data.
// Five-minute ISR: crawlers and repeat visitors get a cached page; the
// client component's own fetches keep the live sections current.
export const revalidate = 300;

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
  return (
    <>
      <CompanyProfileClient initialCompany={initial} />
      {/* Forum discussion (2026-09-14 forum revival). No thread is created by
          viewing this page — 253 company profiles would become 253 empty
          threads. The thread is born on the first real post, with that
          member's words already in it. Matches the client's container width. */}
      {initial && (
        <div id="discussion" className="px-4 lg:px-8 pb-8 max-w-[1400px] mx-auto scroll-mt-24">
          <DiscussThis
            anchorType="company"
            anchorKey={slug}
            subjectLabel={initial.name || slug}
          />
        </div>
      )}
    </>
  );
}
