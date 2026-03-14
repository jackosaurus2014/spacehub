import { readFileSync, writeFileSync } from 'fs';

const pages = [
  {
    file: 'src/app/constellations/page.tsx',
    modules: [
      { name: 'Satellite Tracker', description: 'Track 19,000+ objects in real-time orbit', href: '/satellites', icon: '\u{1F6F0}\uFE0F' },
      { name: 'Orbital Slots', description: 'GEO/MEO/LEO slot allocations and services', href: '/orbital-slots', icon: '\u{1F4E1}' },
      { name: 'Space Environment', description: 'Space weather, debris, and situational awareness', href: '/space-environment', icon: '\u{1F30D}' },
      { name: 'Launch Vehicles', description: 'Compare launch providers and capabilities', href: '/launch-vehicles', icon: '\u{1F680}' },
    ],
  },
  {
    file: 'src/app/ground-stations/page.tsx',
    modules: [
      { name: 'Satellite Tracker', description: 'Real-time orbital tracking and pass predictions', href: '/satellites', icon: '\u{1F6F0}\uFE0F' },
      { name: 'Space Communications', description: 'RF systems and link budget analysis', href: '/space-comms', icon: '\u{1F4E1}' },
      { name: 'Spectrum Management', description: 'Frequency allocations and coordination', href: '/spectrum', icon: '\u{1F4FB}' },
      { name: 'Orbital Slots', description: 'GEO/MEO/LEO slot allocations', href: '/orbital-slots', icon: '\u{1F310}' },
    ],
  },
  {
    file: 'src/app/mission-control/page.tsx',
    modules: [
      { name: 'Mission Planning', description: 'Cost estimation and mission design tools', href: '/mission-cost', icon: '\u{1F4CA}' },
      { name: 'Satellite Tracker', description: 'Real-time orbital tracking for active missions', href: '/satellites', icon: '\u{1F6F0}\uFE0F' },
      { name: 'Launch Vehicles', description: 'Compare launch providers and capabilities', href: '/launch-vehicles', icon: '\u{1F680}' },
      { name: 'Space Environment', description: 'Weather and debris monitoring for ops', href: '/space-environment', icon: '\u{1F30D}' },
    ],
  },
  {
    file: 'src/app/business-opportunities/page.tsx',
    modules: [
      { name: 'Marketplace', description: 'Find and connect with space service providers', href: '/marketplace', icon: '\u{1F3EA}' },
      { name: 'Supply Chain', description: 'Space industry supply chain intelligence', href: '/supply-chain', icon: '\u{1F517}' },
      { name: 'Compliance Hub', description: 'Regulatory requirements and filings', href: '/compliance', icon: '\u{1F4CB}' },
      { name: 'Space Mining', description: 'ISRU and asteroid mining opportunities', href: '/space-mining', icon: '\u26CF\uFE0F' },
    ],
  },
  {
    file: 'src/app/company-profiles/page.tsx',
    modules: [
      { name: 'Market Intelligence', description: 'Space industry market data and trends', href: '/market-intel', icon: '\u{1F4C8}' },
      { name: 'Funding Tracker', description: 'VC deals and investment rounds', href: '/funding-tracker', icon: '\u{1F4B0}' },
      { name: 'Investment Tracker', description: 'Space sector investment analysis', href: '/investment-tracker', icon: '\u{1F4CA}' },
      { name: 'Space Talent Hub', description: 'Jobs and workforce intelligence', href: '/space-talent', icon: '\u{1F465}' },
    ],
  },
  {
    file: 'src/app/marketplace/page.tsx',
    modules: [
      { name: 'Company Profiles', description: 'Detailed profiles of 100+ space companies', href: '/company-profiles', icon: '\u{1F3E2}' },
      { name: 'Funding Tracker', description: 'Track investment rounds and VC activity', href: '/funding-tracker', icon: '\u{1F4B0}' },
      { name: 'Business Opportunities', description: 'Contracts, RFPs, and procurement', href: '/business-opportunities', icon: '\u{1F4CB}' },
      { name: 'Space Talent Hub', description: 'Hire or find jobs in the space industry', href: '/space-talent', icon: '\u{1F465}' },
    ],
  },
  {
    file: 'src/app/supply-chain/page.tsx',
    modules: [
      { name: 'Business Opportunities', description: 'Contracts and procurement opportunities', href: '/business-opportunities', icon: '\u{1F4CB}' },
      { name: 'Marketplace', description: 'Find space service providers', href: '/marketplace', icon: '\u{1F3EA}' },
      { name: 'Space Manufacturing', description: 'In-space and terrestrial manufacturing', href: '/space-manufacturing', icon: '\u{1F3ED}' },
      { name: 'Supply Chain Risk', description: 'Risk assessment and mitigation strategies', href: '/supply-chain-risk', icon: '\u26A0\uFE0F' },
    ],
  },
  {
    file: 'src/app/launch-vehicles/page.tsx',
    modules: [
      { name: 'Mission Planning', description: 'Cost estimation and mission design', href: '/mission-cost', icon: '\u{1F4CA}' },
      { name: 'Space Manufacturing', description: 'Rocket and satellite manufacturing', href: '/space-manufacturing', icon: '\u{1F3ED}' },
      { name: 'Spaceports', description: 'Global launch site directory', href: '/spaceports', icon: '\u{1F3D7}\uFE0F' },
      { name: 'Launch Sites', description: 'Worldwide launch facility profiles', href: '/launch-sites', icon: '\u{1F4CD}' },
    ],
  },
  {
    file: 'src/app/mars-planner/page.tsx',
    modules: [
      { name: 'Solar Exploration', description: 'Planetary science and deep space missions', href: '/solar-exploration', icon: '\u{1FA90}' },
      { name: 'Cislunar Economy', description: 'Earth-Moon space commerce and logistics', href: '/cislunar', icon: '\u{1F319}' },
      { name: 'Asteroid Watch', description: 'Near-Earth objects and mining targets', href: '/asteroid-watch', icon: '\u2604\uFE0F' },
      { name: 'Mission Planning', description: 'Cost estimation and design tools', href: '/mission-cost', icon: '\u{1F4CA}' },
    ],
  },
  {
    file: 'src/app/cislunar/page.tsx',
    modules: [
      { name: 'Solar Exploration', description: 'Planetary missions and deep space', href: '/solar-exploration', icon: '\u{1FA90}' },
      { name: 'Asteroid Watch', description: 'NEOs, mining targets, and risk assessment', href: '/asteroid-watch', icon: '\u2604\uFE0F' },
      { name: 'Mars Planner', description: 'Mars mission design and logistics', href: '/mars-planner', icon: '\u{1F534}' },
      { name: 'Space Stations', description: 'Orbital habitats and platforms', href: '/space-stations', icon: '\u{1F3D7}\uFE0F' },
    ],
  },
  {
    file: 'src/app/asteroid-watch/page.tsx',
    modules: [
      { name: 'Solar Exploration', description: 'Planetary science and mission data', href: '/solar-exploration', icon: '\u{1FA90}' },
      { name: 'Space Environment', description: 'Space weather and debris tracking', href: '/space-environment', icon: '\u{1F30D}' },
      { name: 'Cislunar Economy', description: 'Earth-Moon commerce and ISRU', href: '/cislunar', icon: '\u{1F319}' },
      { name: 'Mars Planner', description: 'Deep space mission planning', href: '/mars-planner', icon: '\u{1F534}' },
    ],
  },
  {
    file: 'src/app/space-tourism/page.tsx',
    modules: [
      { name: 'Business Opportunities', description: 'Space industry contracts and RFPs', href: '/business-opportunities', icon: '\u{1F4CB}' },
      { name: 'Cislunar Economy', description: 'Earth-Moon tourism and commerce', href: '/cislunar', icon: '\u{1F319}' },
      { name: 'Mars Planner', description: 'Future Mars tourism missions', href: '/mars-planner', icon: '\u{1F534}' },
      { name: 'Space Agencies', description: 'Government programs and partnerships', href: '/space-agencies', icon: '\u{1F3DB}\uFE0F' },
    ],
  },
  {
    file: 'src/app/ai-insights/page.tsx',
    modules: [
      { name: 'Market Intelligence', description: 'Space industry market data and analysis', href: '/market-intel', icon: '\u{1F4C8}' },
      { name: 'Mission Control', description: 'Real-time space operations dashboard', href: '/mission-control', icon: '\u{1F3AF}' },
      { name: 'Space Talent Hub', description: 'Jobs and workforce trends', href: '/space-talent', icon: '\u{1F465}' },
      { name: 'News', description: 'Latest space industry news', href: '/news', icon: '\u{1F4F0}' },
    ],
  },
  {
    file: 'src/app/space-manufacturing/page.tsx',
    modules: [
      { name: 'Supply Chain', description: 'Space supply chain intelligence', href: '/supply-chain', icon: '\u{1F517}' },
      { name: 'Launch Vehicles', description: 'Rocket and launch system comparison', href: '/launch-vehicles', icon: '\u{1F680}' },
      { name: 'Marketplace', description: 'Find manufacturing service providers', href: '/marketplace', icon: '\u{1F3EA}' },
      { name: 'Business Opportunities', description: 'Manufacturing contracts and RFPs', href: '/business-opportunities', icon: '\u{1F4CB}' },
    ],
  },
  {
    file: 'src/app/space-defense/page.tsx',
    modules: [
      { name: 'Compliance Hub', description: 'Regulatory requirements and filings', href: '/compliance', icon: '\u{1F4CB}' },
      { name: 'Space Law', description: 'International space law and treaties', href: '/space-law', icon: '\u2696\uFE0F' },
      { name: 'Regulatory Risk', description: 'Risk assessment and compliance scoring', href: '/regulatory-risk', icon: '\u26A0\uFE0F' },
      { name: 'Space Agencies', description: 'Government space programs', href: '/space-agencies', icon: '\u{1F3DB}\uFE0F' },
    ],
  },
];

let updated = 0;

for (const page of pages) {
  let content = readFileSync(page.file, 'utf-8');

  if (content.includes('RelatedModules')) {
    console.log('SKIP (already has): ' + page.file);
    continue;
  }

  // Add import for RelatedModules
  if (content.includes("import ScrollReveal")) {
    content = content.replace(
      /(import ScrollReveal[^\n]*\n)/,
      "$1import RelatedModules from '@/components/ui/RelatedModules';\n"
    );
  } else if (content.includes("import AnimatedPageHeader")) {
    content = content.replace(
      /(import AnimatedPageHeader[^\n]*\n)/,
      "$1import ScrollReveal from '@/components/ui/ScrollReveal';\nimport RelatedModules from '@/components/ui/RelatedModules';\n"
    );
  } else {
    // Add after first import block
    content = content.replace(
      /(import [^\n]*\n)/,
      "$1import ScrollReveal from '@/components/ui/ScrollReveal';\nimport RelatedModules from '@/components/ui/RelatedModules';\n"
    );
  }

  // Build the RelatedModules JSX
  const modulesArr = page.modules.map(m =>
    '              { name: \'' + m.name + '\', description: \'' + m.description + '\', href: \'' + m.href + '\', icon: \'' + m.icon + '\' }'
  ).join(',\n');

  const relatedBlock = '\n            <ScrollReveal>\n              <RelatedModules\n                modules={[\n' + modulesArr + ',\n                ]}\n              />\n            </ScrollReveal>\n';

  // Find insertion point
  if (content.includes('{/* Bottom spacing */}')) {
    content = content.replace(
      /\{\/\* Bottom spacing \*\/\}\s*\n\s*<div className="h-12" \/>/,
      relatedBlock + '\n            {/* Bottom spacing */}\n            <div className="h-12" />'
    );
  } else {
    // Insert before the last two </div> + ); pattern
    // Find last occurrence of </div>\n  );\n}
    const lines = content.split('\n');
    let insertLine = -1;
    // Work backwards to find a good insertion point
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === '</div>' && i > 5) {
        // Check if this is followed by another </div> or );
        const nextTrimmed = (lines[i + 1] || '').trim();
        if (nextTrimmed === '</div>' || nextTrimmed === ');') {
          insertLine = i;
          break;
        }
      }
    }
    if (insertLine > 0) {
      lines.splice(insertLine, 0, relatedBlock);
      content = lines.join('\n');
    } else {
      console.log('WARN: Could not find insertion point for ' + page.file);
      continue;
    }
  }

  writeFileSync(page.file, content, 'utf-8');
  console.log('Updated: ' + page.file);
  updated++;
}

console.log('\nTotal: ' + updated + ' pages updated with RelatedModules');
