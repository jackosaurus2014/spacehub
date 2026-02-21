/**
 * Data Enrichment — Barrel Export
 *
 * Re-exports all enrichment modules for clean imports.
 *
 * Usage:
 *   import { fetchCompanyFinancials, fetchAllSpaceGitHubActivity } from '@/lib/data-enrichment';
 */

// SEC EDGAR Financial Data
export {
  fetchCompanyFinancials,
  fetchAllSpaceCompanyFinancials,
  SPACE_COMPANY_TICKERS,
  type CompanyFinancialSummary,
  type SECFiling,
} from './sec-edgar';

// USPTO PatentsView
export {
  fetchCompanyPatents,
  fetchAllSpaceCompanyPatents,
  SPACE_PATENT_ASSIGNEES,
  type CompanyPatentSummary,
  type PatentRecord,
} from './uspto-patents';

// GitHub Public Activity
export {
  fetchOrgGitHubActivity,
  fetchAllSpaceGitHubActivity,
  SPACE_GITHUB_ORGS,
  type OrgActivitySummary,
} from './github-activity';

// FCC ULS License Data
export {
  fetchCompanyLicenses,
  fetchAllSpaceLicenses,
  SPACE_FCC_OPERATORS,
  type CompanyLicenseSummary,
  type FCCLicenseRecord,
} from './fcc-licenses';
