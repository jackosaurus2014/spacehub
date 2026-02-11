/**
 * Compliance fetcher
 * Fetches legal updates from RSS feeds, ITU filings, and export control updates
 */

import Parser from 'rss-parser';
import prisma from '@/lib/db';
import { upsertContent } from '@/lib/dynamic-content';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';

const federalRegisterBreaker = createCircuitBreaker('compliance-federal-register', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'SpaceNexus/1.0 (space industry compliance tracker)',
  },
});

/**
 * Fetch legal updates from RSS feeds stored in the LegalSource table
 */
export async function fetchAndStoreLegalUpdates(): Promise<number> {
  let totalSaved = 0;
  let successCount = 0;
  let failCount = 0;

  try {
    const sources = await prisma.legalSource.findMany({
      where: { feedUrl: { not: null } },
      select: { id: true, name: true, feedUrl: true, type: true, organization: true },
    });

    if (sources.length === 0) {
      logger.info('[Compliance] No legal sources with feed URLs found');
      return 0;
    }

    for (const source of sources) {
      if (!source.feedUrl) continue;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        let feed;
        try {
          feed = await parser.parseURL(source.feedUrl);
        } finally {
          clearTimeout(timeout);
        }

        if (!feed.items || feed.items.length === 0) continue;

        let count = 0;
        for (const item of feed.items.slice(0, 20)) {
          if (!item.title || !item.link) continue;

          try {
            await prisma.legalUpdate.upsert({
              where: { url: item.link },
              update: {
                title: item.title,
                excerpt: (item.contentSnippet || item.content || '').slice(0, 500) || null,
                topics: source.type || 'general',
              },
              create: {
                title: item.title,
                content: item.content || item.contentSnippet || null,
                excerpt: (item.contentSnippet || item.content || '').slice(0, 500) || null,
                source: source.name,
                url: item.link,
                topics: source.type || 'general',
                publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
              },
            });
            count++;
          } catch {
            // Skip duplicate or invalid entries
          }
        }

        totalSaved += count;
        successCount++;
      } catch (err) {
        failCount++;
        logger.warn(`[Compliance] Failed to fetch feed: ${source.name}`, {
          feedUrl: source.feedUrl,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('[Compliance] Legal updates fetch complete', {
      sources: sources.length,
      success: successCount,
      failed: failCount,
      totalSaved,
    });
  } catch (error) {
    logger.error('[Compliance] Legal updates fetch error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return totalSaved;
}

/**
 * Fetch ITU/international telecom filings from Federal Register
 */
export async function fetchAndStoreITUFilings(): Promise<number> {
  return federalRegisterBreaker.execute(async () => {
    const params = new URLSearchParams({
      'conditions[term]': 'international telecommunication OR satellite filing OR ITU OR spectrum allocation OR NGSO',
      'per_page': '25',
      'order': 'newest',
      'fields[]': 'title,type,abstract,document_number,html_url,pdf_url,publication_date,agencies,action',
    });

    const response = await fetch(
      `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`Federal Register API error: ${response.status}`);
    }

    const data = await response.json();
    const documents = data.results || [];

    const filings = documents.map((doc: {
      title: string;
      type: string;
      abstract?: string;
      document_number: string;
      html_url: string;
      pdf_url: string;
      publication_date: string;
      agencies?: Array<{ name: string }>;
      action?: string;
    }) => ({
      title: doc.title,
      type: doc.type,
      summary: doc.abstract || '',
      documentNumber: doc.document_number,
      url: doc.html_url,
      pdfUrl: doc.pdf_url,
      publishedDate: doc.publication_date,
      agency: doc.agencies?.[0]?.name || 'FCC/ITU',
      action: doc.action || doc.type,
    }));

    if (filings.length > 0) {
      await upsertContent(
        'compliance:itu-filings',
        'compliance',
        'itu-filings',
        {
          filings,
          fetchedAt: new Date().toISOString(),
          count: filings.length,
        },
        { sourceType: 'api', sourceUrl: 'https://www.federalregister.gov/api/v1/documents' }
      );
    }

    logger.info('ITU filings fetch complete', { count: filings.length });
    return filings.length;
  }, 0);
}

/**
 * Fetch export control updates (BIS/DDTC) from Federal Register
 */
export async function fetchAndStoreExportControlUpdates(): Promise<number> {
  return federalRegisterBreaker.execute(async () => {
    const params = new URLSearchParams({
      'conditions[term]': 'ITAR OR EAR OR export control OR space OR satellite OR defense trade',
      'per_page': '25',
      'order': 'newest',
      'fields[]': 'title,type,abstract,document_number,html_url,pdf_url,publication_date,agencies,action',
    });

    // Filter for BIS and State Department
    const url = `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}&conditions[agencies][]=bureau-of-industry-and-security&conditions[agencies][]=state-department`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Federal Register API error: ${response.status}`);
    }

    const data = await response.json();
    const documents = data.results || [];

    const updates = documents.map((doc: {
      title: string;
      type: string;
      abstract?: string;
      document_number: string;
      html_url: string;
      pdf_url: string;
      publication_date: string;
      agencies?: Array<{ name: string }>;
      action?: string;
    }) => ({
      title: doc.title,
      type: doc.type,
      summary: doc.abstract || '',
      documentNumber: doc.document_number,
      url: doc.html_url,
      pdfUrl: doc.pdf_url,
      publishedDate: doc.publication_date,
      agency: doc.agencies?.[0]?.name || 'BIS/DDTC',
      action: doc.action || doc.type,
    }));

    if (updates.length > 0) {
      await upsertContent(
        'compliance:export-control-updates',
        'compliance',
        'export-control-updates',
        {
          updates,
          fetchedAt: new Date().toISOString(),
          count: updates.length,
        },
        { sourceType: 'api', sourceUrl: 'https://www.federalregister.gov/api/v1/documents' }
      );
    }

    logger.info('Export control updates fetch complete', { count: updates.length });
    return updates.length;
  }, 0);
}

/**
 * Orchestrator: refresh all compliance data sources
 */
export async function refreshComplianceData(): Promise<{
  legalUpdates: number;
  ituFilings: number;
  exportControl: number;
  total: number;
}> {
  const legalUpdates = await fetchAndStoreLegalUpdates();
  const ituFilings = await fetchAndStoreITUFilings();
  const exportControl = await fetchAndStoreExportControlUpdates();

  const total = legalUpdates + ituFilings + exportControl;

  logger.info('Compliance refresh complete', {
    legalUpdates,
    ituFilings,
    exportControl,
    total,
  });

  return { legalUpdates, ituFilings, exportControl, total };
}
