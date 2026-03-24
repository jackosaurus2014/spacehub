/**
 * Script to add RelatedModules component to pages that don't have it.
 * Uses the centralized PAGE_RELATIONS mapping from module-relationships.ts
 *
 * Usage: npx tsx scripts/add-related-modules.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.join(__dirname, '..', 'src', 'app');

// All page routes that should have RelatedModules (from PAGE_RELATIONS keys)
const PAGE_ROUTES = [
  // ── Existing routes (Wave 68) ──
  'news', 'blogs', 'news-digest', 'intelligence-brief', 'news-aggregator',
  'podcasts', 'resources', 'newsletters-directory', 'investment-tracker',
  'investment-thesis', 'deal-flow', 'ma-tracker', 'startup-tracker',
  'report-cards', 'market-map', 'ecosystem-map', 'industry-trends',
  'space-score', 'executive-moves', 'space-investors', 'market-sizing',
  'government-budgets', 'contract-awards', 'funding-rounds', 'funding-opportunities',
  'orbital-costs', 'orbital-calculator', 'constellation-designer',
  'power-budget-calculator', 'link-budget-calculator', 'tools',
  'launch-cost-calculator', 'launch-economics', 'launch-manifest',
  'launch-sites', 'launch-windows', 'mission-simulator', 'mission-heritage',
  'mission-pipeline', 'mission-stats', 'mission-cost', 'unit-economics',
  'space-talent', 'jobs', 'salary-benchmarks', 'career-guide',
  'workforce-analytics', 'education-pathways', 'orbital-slots', 'space-stations',
  'regulations', 'space-law', 'rf-spectrum', 'frequency-database',
  'frequency-bands', 'glossary', 'acronyms', 'timeline', 'orbit-guide',
  'tech-readiness', 'conferences', 'learn', 'materials-database',
  'propulsion-database', 'propulsion-comparison', 'standards-reference',
  'clean-room-reference', 'satellite-bus-comparison', 'radiation-calculator',
  'thermal-calculator', 'sustainability-scorecard', 'space-edge-computing',
  'imagery-providers', 'debris-catalog', 'debris-tracker',
  'space-weather', 'space-events', 'space-tourism', 'space-agencies',
  'marketplace', 'business-models', 'deals', 'deal-rooms',
  'portfolio-tracker', 'customer-discovery', 'alerts', 'reading-list',
  'dashboard', 'procurement', 'patents', 'space-mining',
  'space-manufacturing', 'supply-chain-risk', 'supply-chain-map',
  'legal-resources',

  // ── Wave 69: Pages that already have PAGE_RELATIONS but no component ──
  'advertise', 'api-access', 'blueprints', 'company-research', 'daily-digest',
  'data-sources', 'earth-events', 'ground-station-directory', 'help', 'investors',
  'my-watchlists', 'pricing', 'regulatory-agencies', 'resource-exchange',
  'satellite-2026', 'solar-exploration', 'space-insurance', 'space-stats',
  'spaceports', 'spectrum', 'why-spacenexus', 'satellite-tracker',
  'compliance', 'space-environment', 'market-intel', 'company-profiles',
  'supply-chain', 'launch-vehicles', 'space-defense', 'ai-insights',
  'constellations', 'ground-stations', 'satellites', 'debris-remediation',
  'space-comms', 'licensing-checker', 'export-classifications',
  'compliance-checklist', 'regulatory-risk', 'regulatory-calendar',
  'regulatory-tracker', 'isru', 'mars-planner', 'cislunar', 'asteroid-watch',
  'business-opportunities', 'patent-landscape', 'space-capital',
  'funding-tracker', 'space-economy',

  // ── Wave 69: New PAGE_RELATIONS entries + new pages ──
  'blog', 'compare', 'compare/astra-vs-virgin-orbit', 'compare/bloomberg-terminal',
  'compare/boeing-vs-lockheed-space', 'compare/companies',
  'compare/iridium-vs-globalstar', 'compare/launch-vehicles',
  'compare/maxar-vs-airbus-defence-space', 'compare/newsletters',
  'compare/northrop-grumman-vs-l3harris-space', 'compare/payload-space',
  'compare/planet-labs-vs-maxar', 'compare/quilty-analytics',
  'compare/relativity-space-vs-firefly', 'compare/rocket-lab-vs-relativity-space',
  'compare/satellite-buses', 'compare/satellites',
  'compare/spacenexus-vs-bryce-tech', 'compare/spacex-vs-blue-origin',
  'compare/spacex-vs-rocket-lab', 'compare/spacex-vs-ula',
  'compare/starlink-vs-kuiper', 'compare/starlink-vs-oneweb',
  'compare/virgin-galactic-vs-blue-origin',
  'developer', 'developer/docs', 'developer/explorer',
  'discover', 'faq',
  'guide/how-satellite-tracking-works', 'guide/satellite-companies',
  'guide/satellite-tracking-guide', 'guide/space-business-opportunities',
  'guide/space-companies-directory', 'guide/space-economy-investment',
  'guide/space-industry', 'guide/space-industry-market-size',
  'guide/space-launch-cost-comparison', 'guide/space-launch-schedule-2026',
  'guide/space-mining-guide', 'guide/space-regulatory-compliance',
  'guide/itar-compliance-guide',
  'launches', 'launch', 'live', 'market-segments',
  'night-sky', 'night-sky-guide', 'press',
  'regulation-explainers', 'reports', 'sectors',
  'this-day-in-space', 'videos', 'whats-overhead', 'year-in-review',
  'features', 'getting-started', 'case-studies', 'book-demo',
  'enterprise', 'solutions', 'solutions/investors', 'solutions/analysts',
  'solutions/engineers', 'solutions/executives', 'solutions/space-professionals',
  'use-cases', 'careers', 'industry-scorecard', 'space-calendar',
  'space-map', 'startup-directory', 'media-kit', 'newsletter',
  'satellite-spotting', 'aurora-forecast', 'alternatives',
  'learn/space-industry',
];

let updated = 0;
let skipped = 0;
let notFound = 0;

for (const route of PAGE_ROUTES) {
  const filePath = path.join(APP_DIR, route, 'page.tsx');

  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${route}/page.tsx - file not found`);
    notFound++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already has RelatedModules
  if (content.includes('RelatedModules') || content.includes('module-relationships')) {
    console.log(`[SKIP] ${route}/page.tsx - already has RelatedModules`);
    skipped++;
    continue;
  }

  // Add imports
  const relatedImport = `import RelatedModules from '@/components/ui/RelatedModules';\nimport { PAGE_RELATIONS } from '@/lib/module-relationships';`;

  // Find the right place to add imports
  // Look for the last import statement
  const importLines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].startsWith('import ') || importLines[i].startsWith("import{")) {
      lastImportIndex = i;
    }
    // Also handle multi-line imports
    if (importLines[i].match(/^} from ['"]/) && lastImportIndex < i) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    console.log(`[SKIP] ${route}/page.tsx - no imports found`);
    skipped++;
    continue;
  }

  // Insert import after last import
  importLines.splice(lastImportIndex + 1, 0, relatedImport);
  content = importLines.join('\n');

  // Add the RelatedModules component before the last closing tags
  // Strategy: find the return statement's main wrapper and insert before it closes
  // We look for the pattern of closing divs at the end of the component

  // Find the last </div> sequences (typically 2-4 closing divs at end of return)
  const closingPattern = /(\n\s*<\/div>\s*\n\s*<\/div>\s*\n?\s*\))/;
  const closingMatch = content.match(closingPattern);

  if (closingMatch && closingMatch.index !== undefined) {
    // Insert before the last pair of closing divs
    const insertionPoint = closingMatch.index;
    const relatedComponent = `\n\n        <RelatedModules modules={PAGE_RELATIONS['${route}']} />`;
    content = content.slice(0, insertionPoint) + relatedComponent + content.slice(insertionPoint);
  } else {
    // Fallback: find the last </div> before the closing ) of the return
    // Look for return ( ... ) pattern
    const returnEndPattern = /(<\/div>\s*\n\s*\);?\s*\n?\s*})/;
    const returnMatch = content.match(returnEndPattern);

    if (returnMatch && returnMatch.index !== undefined) {
      const relatedComponent = `\n\n        <RelatedModules modules={PAGE_RELATIONS['${route}']} />\n      `;
      content = content.slice(0, returnMatch.index) + relatedComponent + content.slice(returnMatch.index);
    } else {
      console.log(`[WARN] ${route}/page.tsx - could not find insertion point`);
      skipped++;
      continue;
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`[OK] ${route}/page.tsx - added RelatedModules`);
  updated++;
}

console.log(`\n--- Summary ---`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Not found: ${notFound}`);
console.log(`Total routes: ${PAGE_ROUTES.length}`);
