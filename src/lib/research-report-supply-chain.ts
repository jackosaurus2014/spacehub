/**
 * SpaceNexus Supply-Chain Concentration Report — quarterly.
 *
 * Computed over the analyst-maintained supply-chain map and the bill-of-
 * materials risk register. Both are reviewed rather than scraped, which makes
 * them the most honesty-sensitive inputs on the site: concentration figures
 * over a curated map are shares OF THE MAP, and a reader who mistakes them for
 * shares of the industry has been misled by us, not by themselves. Every
 * table therefore prints its denominator, and the coverage block says the
 * quiet part out loud.
 *
 * WHAT MAKES CONSECUTIVE EDITIONS HONEST
 * --------------------------------------
 * The map has no time series: it describes "now" and changes in steps when an
 * analyst edits it. A quarterly release over a static input could quietly
 * republish the same numbers forever and look like work. So each edition
 * hashes its computed content, and the publication log keeps the previous
 * edition's hash. When they match, the page states plainly that nothing in the
 * map changed that quarter. An unchanged quarter is reported as unchanged.
 */

import {
  SUPPLY_CHAIN_COMPANIES,
  SUPPLY_RELATIONSHIPS,
  SUPPLY_SHORTAGES,
} from '@/lib/supply-chain-data';
import { BOM_RISK_ITEMS } from '@/lib/supply-chain-bom-risks';
import {
  fmtCount,
  fmtShare,
  hashEditionContent,
  type ReportFigure,
  type ReportTable,
  type ResearchReportEdition,
} from '@/lib/research-report-types';
import {
  getRelease,
  periodEndDate,
  periodLabel,
  periodRange,
} from '@/lib/research-releases';

const RELEASE_ID = 'supply-chain-concentration';

const TIER_LABEL: Record<string, string> = {
  prime: 'Prime contractor',
  tier1: 'Tier 1 supplier',
  tier2: 'Tier 2 supplier',
  tier3: 'Tier 3 supplier',
};

export async function buildSupplyChainEdition(period: string): Promise<ResearchReportEdition> {
  const release = getRelease(RELEASE_ID)!;
  const range = periodRange('quarterly', period);
  if (!range) throw new Error(`Invalid quarter: ${period}`);

  const asOf = periodEndDate('quarterly', period)!;
  const quarterEnd = new Date(range.end.getTime() - 86_400_000);
  const computedAt = new Date().toISOString();
  const title = `${release.title}, ${periodLabel('quarterly', period)}`;

  const companyById = new Map(SUPPLY_CHAIN_COMPANIES.map((c) => [c.id, c]));
  const totalRelationships = SUPPLY_RELATIONSHIPS.length;
  const criticalRelationships = SUPPLY_RELATIONSHIPS.filter((r) => r.isCritical);

  // --- Concentration by country -------------------------------------------
  // Attribution follows the SUPPLIER's country: the question the table answers
  // is "where does the supply come from", not "who buys it".
  const byCountry = new Map<
    string,
    { relationships: number; critical: number; suppliers: Set<string>; highRisk: number }
  >();
  for (const rel of SUPPLY_RELATIONSHIPS) {
    const supplier = companyById.get(rel.supplierId);
    const country = supplier?.country ?? 'Unmapped';
    const bucket =
      byCountry.get(country) ?? { relationships: 0, critical: 0, suppliers: new Set<string>(), highRisk: 0 };
    bucket.relationships += 1;
    if (rel.isCritical) bucket.critical += 1;
    // 'high' is the top of the GeopoliticalRisk scale in src/types/index.ts.
    if (rel.geopoliticalRisk === 'high') bucket.highRisk += 1;
    bucket.suppliers.add(rel.supplierId);
    byCountry.set(country, bucket);
  }
  const countryRows = Array.from(byCountry.entries())
    .map(([country, v]) => ({
      country,
      suppliers: v.suppliers.size,
      relationships: v.relationships,
      sharePercent: Math.round((v.relationships / Math.max(1, totalRelationships)) * 1000) / 10,
      criticalRelationships: v.critical,
      criticalSharePercent:
        criticalRelationships.length > 0
          ? Math.round((v.critical / criticalRelationships.length) * 1000) / 10
          : 0,
      highGeopoliticalRisk: v.highRisk,
    }))
    .sort((a, b) => b.relationships - a.relationships || a.country.localeCompare(b.country));

  // --- Concentration by tier ----------------------------------------------
  const byTier = new Map<string, { companies: number; relationships: number; critical: number }>();
  for (const company of SUPPLY_CHAIN_COMPANIES) {
    const bucket = byTier.get(company.tier) ?? { companies: 0, relationships: 0, critical: 0 };
    bucket.companies += 1;
    byTier.set(company.tier, bucket);
  }
  for (const rel of SUPPLY_RELATIONSHIPS) {
    const supplier = companyById.get(rel.supplierId);
    if (!supplier) continue;
    const bucket = byTier.get(supplier.tier) ?? { companies: 0, relationships: 0, critical: 0 };
    bucket.relationships += 1;
    if (rel.isCritical) bucket.critical += 1;
    byTier.set(supplier.tier, bucket);
  }
  const tierRows = Array.from(byTier.entries())
    .map(([tier, v]) => ({
      tier: TIER_LABEL[tier] ?? tier,
      mappedCompanies: v.companies,
      relationshipsSupplied: v.relationships,
      sharePercent: Math.round((v.relationships / Math.max(1, totalRelationships)) * 1000) / 10,
      criticalRelationships: v.critical,
    }))
    .sort((a, b) => b.relationshipsSupplied - a.relationshipsSupplied || a.tier.localeCompare(b.tier));

  // --- Chokepoints: suppliers by distinct customers ------------------------
  const bySupplier = new Map<
    string,
    { name: string; customers: Set<string>; critical: number; products: Set<string> }
  >();
  for (const rel of SUPPLY_RELATIONSHIPS) {
    const bucket =
      bySupplier.get(rel.supplierId) ??
      { name: rel.supplierName, customers: new Set<string>(), critical: 0, products: new Set<string>() };
    bucket.customers.add(rel.customerId);
    if (rel.isCritical) bucket.critical += 1;
    for (const p of rel.products ?? []) bucket.products.add(p);
    bySupplier.set(rel.supplierId, bucket);
  }
  const chokepointRows = Array.from(bySupplier.entries())
    .map(([id, v]) => {
      const company = companyById.get(id);
      return {
        supplier: v.name,
        supplierSlug: company?.slug ?? '',
        country: company?.country ?? 'Unmapped',
        tier: TIER_LABEL[company?.tier ?? ''] ?? company?.tier ?? '',
        dependentCustomers: v.customers.size,
        criticalRelationships: v.critical,
        products: Array.from(v.products).sort().join('; '),
      };
    })
    .sort(
      (a, b) =>
        b.dependentCustomers - a.dependentCustomers ||
        b.criticalRelationships - a.criticalRelationships ||
        a.supplier.localeCompare(b.supplier)
    );

  // --- Single-source dependencies -----------------------------------------
  // A customer whose CRITICAL inputs come from exactly one mapped supplier.
  const byCustomer = new Map<
    string,
    { name: string; criticalSuppliers: Map<string, { name: string; products: Set<string> }> }
  >();
  for (const rel of SUPPLY_RELATIONSHIPS) {
    if (!rel.isCritical) continue;
    const entry =
      byCustomer.get(rel.customerId) ?? { name: rel.customerName, criticalSuppliers: new Map() };
    const supplier =
      entry.criticalSuppliers.get(rel.supplierId) ?? { name: rel.supplierName, products: new Set<string>() };
    for (const p of rel.products ?? []) supplier.products.add(p);
    entry.criticalSuppliers.set(rel.supplierId, supplier);
    byCustomer.set(rel.customerId, entry);
  }
  const singleSourceRows = Array.from(byCustomer.entries())
    .filter(([, v]) => v.criticalSuppliers.size === 1)
    .map(([customerId, v]) => {
      const [supplierId, supplier] = Array.from(v.criticalSuppliers.entries())[0];
      const supplierCompany = companyById.get(supplierId);
      return {
        customer: v.name,
        customerSlug: companyById.get(customerId)?.slug ?? '',
        soleCriticalSupplier: supplier.name,
        supplierCountry: supplierCompany?.country ?? 'Unmapped',
        products: Array.from(supplier.products).sort().join('; '),
      };
    })
    .sort((a, b) => a.customer.localeCompare(b.customer));

  // --- Bill-of-materials risk ---------------------------------------------
  const elevatedBom = BOM_RISK_ITEMS.filter(
    (i) => i.riskLevel === 'critical' || i.riskLevel === 'high'
  );
  const bomRows = elevatedBom
    .map((i) => ({
      component: i.component,
      category: i.category,
      riskLevel: i.riskLevel,
      primarySuppliers: i.primarySuppliers.join('; '),
      supplierCount: i.primarySuppliers.length,
      alternatives: i.alternatives.length,
      leadTime: i.leadTime,
      usedIn: i.usedIn.join('; '),
    }))
    .sort(
      (a, b) =>
        (a.riskLevel === 'critical' ? 0 : 1) - (b.riskLevel === 'critical' ? 0 : 1) ||
        a.supplierCount - b.supplierCount ||
        a.component.localeCompare(b.component)
    );

  const bomByCategory = new Map<string, { critical: number; high: number }>();
  for (const i of elevatedBom) {
    const bucket = bomByCategory.get(i.category) ?? { critical: 0, high: 0 };
    if (i.riskLevel === 'critical') bucket.critical += 1;
    else bucket.high += 1;
    bomByCategory.set(i.category, bucket);
  }
  const bomCategoryRows = Array.from(bomByCategory.entries())
    .map(([category, v]) => ({
      category,
      critical: v.critical,
      high: v.high,
      total: v.critical + v.high,
    }))
    .sort((a, b) => b.critical - a.critical || b.total - a.total || a.category.localeCompare(b.category));

  const singleSupplierBom = elevatedBom.filter((i) => i.primarySuppliers.length === 1);

  // --- Shortages active at quarter end ------------------------------------
  const activeShortages = SUPPLY_SHORTAGES.filter((s) => {
    if (!s.startDate) return true; // undated shortages are treated as standing
    return new Date(s.startDate).getTime() <= quarterEnd.getTime();
  });
  const shortageRows = activeShortages
    .map((s) => ({
      material: s.material,
      category: s.category,
      severity: s.severity,
      startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : '',
      estimatedResolution: s.estimatedResolution ?? '',
      affectedProducts: (s.affectedProducts ?? []).join('; '),
      impactedCompanies: (s.impactedCompanies ?? []).length,
      alternativeSuppliers: (s.alternativeSuppliers ?? []).length,
    }))
    .sort((a, b) => a.material.localeCompare(b.material));

  const undatedShortages = activeShortages.filter((s) => !s.startDate).length;

  const topCountry = countryRows[0];
  const topThreeShare = countryRows
    .slice(0, 3)
    .reduce((sum, r) => sum + r.relationships, 0);

  const headline: ReportFigure[] = [
    {
      label: 'Mapped relationships',
      value: fmtCount(totalRelationships),
      detail: `${fmtCount(SUPPLY_CHAIN_COMPANIES.length)} companies, ${fmtCount(criticalRelationships.length)} marked critical`,
    },
    {
      label: 'Top supplier country',
      value: topCountry ? topCountry.country : '—',
      detail: topCountry
        ? `${fmtShare(topCountry.relationships, totalRelationships)} of mapped relationships`
        : 'No supplier countries mapped',
    },
    {
      label: 'Top three countries',
      value: fmtShare(topThreeShare, totalRelationships),
      detail: 'Share of mapped relationships, not of the industry',
    },
    {
      label: 'Single-source dependencies',
      value: fmtCount(singleSourceRows.length),
      detail: `${fmtCount(singleSupplierBom.length)} elevated-risk components also name one supplier`,
    },
  ];

  const tables: ReportTable[] = [
    {
      id: 'by-country',
      label: 'Concentration by supplier country',
      description:
        'Mapped supply relationships attributed to the supplier’s country of domicile.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'country', label: 'Country' },
        { key: 'suppliers', label: 'Suppliers', numeric: true },
        { key: 'relationships', label: 'Relationships', numeric: true },
        { key: 'sharePercent', label: 'Share of map', numeric: true },
        { key: 'criticalRelationships', label: 'Critical', numeric: true },
        { key: 'highGeopoliticalRisk', label: 'High geopolitical risk', numeric: true },
      ],
      rows: countryRows.map((r, i) => ({ rank: i + 1, ...r })),
      publicRowLimit: 10,
      note: `Shares are of the ${totalRelationships} relationships in our map. They are not market shares and must not be cited as such.`,
    },
    {
      id: 'by-tier',
      label: 'Concentration by supplier tier',
      description: 'Where in the chain the mapped supply sits.',
      columns: [
        { key: 'tier', label: 'Tier' },
        { key: 'mappedCompanies', label: 'Companies mapped', numeric: true },
        { key: 'relationshipsSupplied', label: 'Relationships supplied', numeric: true },
        { key: 'sharePercent', label: 'Share of map', numeric: true },
        { key: 'criticalRelationships', label: 'Critical', numeric: true },
      ],
      rows: tierRows,
      publicRowLimit: 10,
    },
    {
      id: 'chokepoints',
      label: 'Chokepoints — suppliers by dependent customers',
      description:
        'Suppliers ranked by how many distinct mapped customers depend on them. The fan-in figure, not a revenue figure.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'supplier', label: 'Supplier' },
        { key: 'country', label: 'Country' },
        { key: 'tier', label: 'Tier' },
        { key: 'dependentCustomers', label: 'Dependent customers', numeric: true },
        { key: 'criticalRelationships', label: 'Critical relationships', numeric: true },
      ],
      rows: chokepointRows.map((r, i) => ({ rank: i + 1, ...r })),
      publicRowLimit: 10,
    },
    {
      id: 'single-source',
      label: 'Single-source critical dependencies',
      description:
        'Mapped customers for which exactly one mapped supplier provides a relationship marked critical.',
      columns: [
        { key: 'customer', label: 'Customer' },
        { key: 'soleCriticalSupplier', label: 'Sole critical supplier' },
        { key: 'supplierCountry', label: 'Supplier country' },
        { key: 'products', label: 'Products' },
      ],
      rows: singleSourceRows,
      publicRowLimit: 10,
      note: 'Suppliers outside the map cannot be counted, so this is an upper bound on the single-sourcing we can see and a lower bound on the real figure.',
    },
    {
      id: 'bom-categories',
      label: 'Elevated bill-of-materials risk by category',
      description:
        'Components in the risk register at critical or high risk, grouped by subsystem category.',
      columns: [
        { key: 'category', label: 'Category' },
        { key: 'critical', label: 'Critical', numeric: true },
        { key: 'high', label: 'High', numeric: true },
        { key: 'total', label: 'Total', numeric: true },
      ],
      rows: bomCategoryRows,
      publicRowLimit: 10,
    },
    {
      id: 'bom-items',
      label: 'Elevated-risk components',
      description:
        'Every component the register rates critical or high, sole-supplier items first.',
      columns: [
        { key: 'component', label: 'Component' },
        { key: 'category', label: 'Category' },
        { key: 'riskLevel', label: 'Risk' },
        { key: 'supplierCount', label: 'Named suppliers', numeric: true },
        { key: 'alternatives', label: 'Alternatives listed', numeric: true },
        { key: 'leadTime', label: 'Lead time' },
      ],
      rows: bomRows,
      publicRowLimit: 10,
      note: 'Risk level is an analyst rating recorded in the register. It is the only judgement on this page; every other figure is a count.',
    },
    {
      id: 'shortages',
      label: `Shortages active at ${asOf}`,
      description:
        'Recorded shortages whose start date falls on or before the end of the quarter and for which no resolution is recorded.',
      columns: [
        { key: 'material', label: 'Material' },
        { key: 'category', label: 'Category' },
        { key: 'severity', label: 'Severity' },
        { key: 'startDate', label: 'Started' },
        { key: 'estimatedResolution', label: 'Estimated resolution' },
        { key: 'impactedCompanies', label: 'Companies impacted', numeric: true },
      ],
      rows: shortageRows,
      publicRowLimit: 10,
      note:
        undatedShortages > 0
          ? `${undatedShortages} recorded shortages carry no start date and are treated as standing. They are counted in every edition until the register dates or closes them.`
          : undefined,
    },
  ];

  return {
    releaseId: RELEASE_ID,
    period,
    periodLabel: periodLabel('quarterly', period),
    title,
    asOf,
    computedAt,
    headline,
    tables,
    coverage: [
      `Computed over a curated map of ${SUPPLY_CHAIN_COMPANIES.length} companies and ${totalRelationships} relationships, plus a register of ${BOM_RISK_ITEMS.length} bill-of-materials items. Both are analyst-maintained and reviewed rather than scraped.`,
      'Every share on this page is a share OF THAT MAP. A country holding a third of mapped relationships holds a third of what we have mapped, which is not a market share and must not be cited as one.',
      'Relationships are attributed to the supplier’s country of domicile, not to where manufacturing physically happens. A supplier producing in a third country is counted under its domicile.',
      'Criticality and risk level are analyst ratings recorded in the data. They are the only judgements in this release; every other figure is a count or a ratio over those records.',
      'The map has no time series. It changes when an analyst revises it, so consecutive editions can be identical — and when they are, this page says so instead of presenting unchanged figures as movement.',
      'Nothing on this page is model-generated.',
    ],
    inputHash: hashEditionContent(headline, tables),
    empty: totalRelationships === 0,
    emptyReason:
      totalRelationships === 0 ? 'The supply-chain map holds no relationships.' : undefined,
  };
}
