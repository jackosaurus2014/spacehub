/**
 * Extracts static data from page files into separate data.ts files.
 * Run: node scripts/extract-page-data.mjs
 */
import fs from 'fs';

function extractDataSection(pagePath, startLine, endLine) {
  const content = fs.readFileSync(pagePath, 'utf-8');
  const lines = content.split('\n');
  // Line numbers are 1-based, arrays 0-based
  return lines.slice(startLine - 1, endLine).join('\n');
}

function removeAndInsertImport(pagePath, startLine, endLine, importText) {
  const content = fs.readFileSync(pagePath, 'utf-8');
  const lines = content.split('\n');
  const start = startLine - 1;
  const end = endLine - 1;

  const before = lines.slice(0, start);
  const after = lines.slice(end + 1);
  const newContent = [...before, '', ...after].join('\n');

  const newLines = newContent.split('\n');
  // Find last import line
  let insertIdx = -1;
  for (let i = 0; i < Math.min(newLines.length, 80); i++) {
    if (newLines[i].includes("from '") || newLines[i].includes('from "')) {
      insertIdx = i;
    }
  }
  if (insertIdx === -1) {
    console.error(`Could not find import point in ${pagePath}`);
    return;
  }
  newLines.splice(insertIdx + 1, 0, importText);
  fs.writeFileSync(pagePath, newLines.join('\n'));
  console.log(`${pagePath}: Removed lines ${startLine}-${endLine} (${endLine - startLine + 1} lines), added import`);
}

function writeDataFile(dataPath, header, body) {
  // Add 'export' keyword to top-level declarations
  let exportedBody = body;
  exportedBody = exportedBody.replace(/^(interface )/gm, 'export interface ');
  exportedBody = exportedBody.replace(/^(type )/gm, 'export type ');
  exportedBody = exportedBody.replace(/^(const )/gm, 'export const ');
  fs.writeFileSync(dataPath, header + '\n\n' + exportedBody + '\n');
  console.log(`Created ${dataPath}`);
}

// ═══════════════════════════════════════
// 2. SPECTRUM - lines 39-842
// ═══════════════════════════════════════
{
  const pagePath = 'src/app/spectrum/page.tsx';
  const dataPath = 'src/app/spectrum/data.ts';

  // Types (lines 39-104) + constants (lines 111-842)
  const typesBlock = extractDataSection(pagePath, 39, 104);
  const constantsBlock = extractDataSection(pagePath, 111, 842);

  const header = `// ────────────────────────────────────────
// Static Data for Spectrum page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────`;

  writeDataFile(dataPath, header, typesBlock + '\n\n' + constantsBlock);

  // Now update the page to remove these sections and add imports
  // First remove constants (111-842), then types (39-104)
  // We need to do this carefully - remove from bottom first
  {
    const content = fs.readFileSync(pagePath, 'utf-8');
    const lines = content.split('\n');

    // Remove lines 39-842 (types + all constants) but keep:
    // - line 106-109 (TabId type + ALL_TABS) since they're used by the component
    //   Actually TabId is defined at line 107 and ALL_TABS at 109, let's keep those
    // Wait - TabId and ALL_TABS are between types (39-104) and constants (111-842)
    // So we need to remove 39-104, keep 105-110, remove 111-842

    const before = lines.slice(0, 38); // lines 1-38
    const keepMiddle = lines.slice(104, 110); // lines 105-110 (TabId + ALL_TABS)
    const after = lines.slice(842); // line 843 onwards

    const newLines = [...before, '', ...keepMiddle, '', ...after];
    const newContent = newLines.join('\n');

    // Insert the import
    const finalLines = newContent.split('\n');
    let insertIdx = -1;
    for (let i = 0; i < Math.min(finalLines.length, 50); i++) {
      if (finalLines[i].includes("from '") || finalLines[i].includes('from "')) {
        insertIdx = i;
      }
    }
    if (insertIdx === -1) {
      console.error('Could not find import point for spectrum');
    } else {
      finalLines.splice(insertIdx + 1, 0, `import {
  type AuctionStatus,
  type Auction,
  type FrequencyBand,
  type SatelliteOperator as SpectrumSatelliteOperator,
  type SpectrumChallenge,
  type ITUTimelineEvent,
  type RegulatoryProceeding,
  FILING_STATUS_INFO,
  OPERATOR_FILING_STATUSES,
  SERVICE_LABELS,
  FILING_EXPORT_COLUMNS,
  ALLOCATION_EXPORT_COLUMNS,
  KNOWN_SATELLITE_OPERATORS,
  AUCTIONS,
  FREQUENCY_BANDS,
  SATELLITE_OPERATORS,
  SPECTRUM_CHALLENGES,
  ITU_REGULATORY_TIMELINE,
  REGULATORY_PROCEEDINGS,
  AUCTION_STATUS_STYLES,
  IMPACT_STYLES,
  CONGESTION_STYLES,
} from './data';`);
      fs.writeFileSync(pagePath, finalLines.join('\n'));
      console.log(`${pagePath}: Updated with imports`);
    }
  }
}

// ═══════════════════════════════════════
// 3. COMPLIANCE - Check what data is embedded
// ═══════════════════════════════════════
// Most data is imported from @/lib/regulatory-hub-data
// The embedded data is the Space Law types + status configs (lines 70-245)
// These are relatively small config objects, not huge arrays
// The large data (TREATIES, NATIONAL_LAWS, etc.) uses `let` variables populated at runtime
// Status configs are ~100 lines, worth extracting
{
  const pagePath = 'src/app/compliance/page.tsx';
  const dataPath = 'src/app/compliance/data.ts';

  // Extract lines 70-245 (Space Law types + status configs + Filing types + status styles)
  const dataBlock = extractDataSection(pagePath, 70, 245);

  const header = `// ────────────────────────────────────────
// Static Data for Compliance page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────`;

  writeDataFile(dataPath, header, dataBlock);

  // Update page
  {
    const content = fs.readFileSync(pagePath, 'utf-8');
    const lines = content.split('\n');
    const before = lines.slice(0, 69);
    const after = lines.slice(245);
    const newLines = [...before, '', ...after];
    const newContent = newLines.join('\n');
    const finalLines = newContent.split('\n');
    let insertIdx = -1;
    for (let i = 0; i < Math.min(finalLines.length, 80); i++) {
      if (finalLines[i].includes("from '") || finalLines[i].includes('from "')) {
        insertIdx = i;
      }
    }
    if (insertIdx !== -1) {
      finalLines.splice(insertIdx + 1, 0, `import {
  type SpaceLawTabId,
  type TreatyStatus,
  type NationalLawStatus,
  type ArtemisStatus,
  type ProceedingStatus,
  type BodyType,
  type Treaty,
  type NationalLaw,
  type ArtemisSignatory,
  type LegalProceeding,
  type RegulatoryBody,
  TREATY_STATUS_CONFIG,
  DEFAULT_TREATY_STATUS,
  NATIONAL_STATUS_CONFIG,
  DEFAULT_NATIONAL_STATUS,
  ARTEMIS_STATUS_CONFIG,
  DEFAULT_ARTEMIS_STATUS,
  PROCEEDING_STATUS_CONFIG,
  DEFAULT_PROCEEDING_STATUS,
  BODY_TYPE_CONFIG,
  DEFAULT_BODY_TYPE,
  type FilingStatus,
  type FCCFiling,
  type FAALicense,
  type ITUFiling,
  type SECFiling,
  type FederalRegisterEntry,
  FILING_STATUS_STYLES,
  DEFAULT_FILING_STATUS_STYLE,
  FILING_IMPACT_STYLES,
  DEFAULT_FILING_IMPACT_STYLE,
  FILING_ORBIT_STYLES,
  DEFAULT_FILING_ORBIT_STYLE,
} from './data';`);
      fs.writeFileSync(pagePath, finalLines.join('\n'));
      console.log(`${pagePath}: Updated with imports`);
    }
  }
}

// ═══════════════════════════════════════
// 4. SPACE TALENT - lines 93-361
// ═══════════════════════════════════════
// Constants, workforce data, skills data, geo distributions, salary data, etc.
{
  const pagePath = 'src/app/space-talent/page.tsx';
  const dataPath = 'src/app/space-talent/data.ts';

  // Extract lines 93-361 (Constants + all workforce intelligence data)
  const dataBlock = extractDataSection(pagePath, 93, 361);

  const header = `// ────────────────────────────────────────
// Static Data for Space Talent page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────

import { JobCategory, SeniorityLevel } from '@/types';`;

  writeDataFile(dataPath, header, dataBlock);

  // Update page
  {
    const content = fs.readFileSync(pagePath, 'utf-8');
    const lines = content.split('\n');
    const before = lines.slice(0, 92);
    const after = lines.slice(361);
    const newLines = [...before, '', ...after];
    const newContent = newLines.join('\n');
    const finalLines = newContent.split('\n');
    let insertIdx = -1;
    for (let i = 0; i < Math.min(finalLines.length, 50); i++) {
      if (finalLines[i].includes("from '") || finalLines[i].includes('from "')) {
        insertIdx = i;
      }
    }
    if (insertIdx !== -1) {
      finalLines.splice(insertIdx + 1, 0, `import {
  CATEGORY_COLORS,
  SENIORITY_LABELS,
  JOB_EXPORT_COLUMNS,
  TREND_EXPORT_COLUMNS,
  SECTOR_EMPLOYMENT_DATA,
  SKILLS_DEMAND_DATA,
  GEO_DISTRIBUTION_US,
  GEO_DISTRIBUTION_INTL,
  ROLE_SALARY_DATA,
  EDUCATION_PIPELINE_DATA,
  TOP_EMPLOYERS_DATA,
  WORKFORCE_OVERVIEW_STATS,
  DIVERSITY_DATA,
  AGE_DISTRIBUTION_DATA,
  type SectorEmployment,
  type SkillDemand,
  type GeoDistribution,
  type RoleSalaryRange,
  type EducationPipelineStat,
  type TopEmployer,
  type WorkforceOverviewStat,
  type DiversityBreakdown,
  type AgeDistribution,
} from './data';`);
      fs.writeFileSync(pagePath, finalLines.join('\n'));
      console.log(`${pagePath}: Updated with imports`);
    }
  }
}

// ═══════════════════════════════════════
// 5. SPACE MANUFACTURING - lines 176-1113
// ═══════════════════════════════════════
// Huge fallback data arrays
{
  const pagePath = 'src/app/space-manufacturing/page.tsx';
  const dataPath = 'src/app/space-manufacturing/data.ts';

  // Extract lines 176-1113 (all FALLBACK data + style configs + tabs)
  const dataBlock = extractDataSection(pagePath, 176, 1113);

  // Also need the types from lines 12-166 for the data
  const typesBlock = extractDataSection(pagePath, 12, 166);

  const header = `// ────────────────────────────────────────
// Static Data for Space Manufacturing page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────`;

  writeDataFile(dataPath, header, typesBlock + '\n\n' + dataBlock);

  // Update page
  {
    const content = fs.readFileSync(pagePath, 'utf-8');
    const lines = content.split('\n');

    // Remove types (12-166) and data (176-1113)
    // Keep lines 167-175 (MfgDataContext stuff)
    const before = lines.slice(0, 11); // lines 1-11
    const keepMiddle = lines.slice(166, 175); // lines 167-175
    const after = lines.slice(1113); // line 1114 onwards

    const newLines = [...before, '', ...keepMiddle, '', ...after];
    const newContent = newLines.join('\n');
    const finalLines = newContent.split('\n');
    let insertIdx = -1;
    for (let i = 0; i < Math.min(finalLines.length, 50); i++) {
      if (finalLines[i].includes("from '") || finalLines[i].includes('from "')) {
        insertIdx = i;
      }
    }
    if (insertIdx !== -1) {
      finalLines.splice(insertIdx + 1, 0, `import {
  type TopTabId,
  type MfgTabId,
  type ManufacturingCompany,
  type ISSExperimentCategory,
  type ProductCategory,
  type MarketProjection,
  type ManufacturingProcess,
  type SpaceEnvironmentAdvantage,
  type ImgTabId,
  type SensorType,
  type PricingTier,
  type ProviderStatus,
  type ImageryProvider,
  type UseCase,
  type MarketTrend,
  type MfgDataContextType,
  FALLBACK_COMPANIES,
  FALLBACK_ISS_EXPERIMENT_CATEGORIES,
  FALLBACK_PRODUCT_CATEGORIES,
  FALLBACK_MARKET_PROJECTIONS,
  FALLBACK_MANUFACTURING_PROCESSES,
  FALLBACK_SPACE_ENVIRONMENT_ADVANTAGES,
  FALLBACK_IMG_PROVIDERS,
  FALLBACK_IMG_USE_CASES,
  FALLBACK_IMG_MARKET_TRENDS,
  FALLBACK_IMG_HERO_STATS,
  STATUS_STYLES,
  DEFAULT_STATUS_STYLE,
  MFG_TABS,
  IMG_STATUS_STYLES,
  DEFAULT_IMG_STATUS_STYLE,
  SENSOR_COLORS,
  IMG_PRICING_INFO,
  IMG_TABS,
} from './data';`);
      fs.writeFileSync(pagePath, finalLines.join('\n'));
      console.log(`${pagePath}: Updated with imports`);
    }
  }
}

console.log('\nAll done! Run npm run build to verify.');
