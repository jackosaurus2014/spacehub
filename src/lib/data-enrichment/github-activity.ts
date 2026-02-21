/**
 * GitHub Public Activity Enrichment
 *
 * Tracks open-source activity for space industry organizations on GitHub.
 *
 * API docs: https://docs.github.com/en/rest
 * Rate limit: 60 requests/hour unauthenticated, 5000/hour with token
 * Cost: Free
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';
import { bulkUpsertContent } from '@/lib/dynamic-content';

const githubBreaker = createCircuitBreaker('github-activity', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Known space organizations with verified GitHub presence.
 * Some major space companies (SpaceX, Blue Origin) do not have public GitHub orgs.
 */
export const SPACE_GITHUB_ORGS: Array<{
  orgName: string;
  displayName: string;
}> = [
  { orgName: 'nasa', displayName: 'NASA' },
  { orgName: 'esa', displayName: 'European Space Agency' },
  { orgName: 'RocketLabUSA', displayName: 'Rocket Lab' },
  { orgName: 'planetlabs', displayName: 'Planet Labs' },
  { orgName: 'spire-data', displayName: 'Spire Global' },
  { orgName: 'DigitalGlobe', displayName: 'Maxar Technologies' },
  { orgName: 'Azure', displayName: 'Azure Orbital (Microsoft)' },
  { orgName: 'astropy', displayName: 'AstroPy Project' },
  { orgName: 'poliastro', displayName: 'Poliastro' },
  { orgName: 'cesium', displayName: 'Cesium (CesiumJS)' },
  { orgName: 'OpenMCT', displayName: 'Open MCT (NASA JPL)' },
  { orgName: 'nasa-jpl', displayName: 'NASA JPL' },
  { orgName: 'nasa-gibs', displayName: 'NASA GIBS' },
  { orgName: 'NASAWorldWind', displayName: 'NASA World Wind' },
  { orgName: 'SatNOGS', displayName: 'SatNOGS' },
  { orgName: 'libre-space', displayName: 'Libre Space Foundation' },
];

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string;
  archived: boolean;
  topics: string[];
  open_issues_count: number;
}

interface GitHubOrg {
  login: string;
  name: string | null;
  description: string | null;
  html_url: string;
  public_repos: number;
  avatar_url: string;
  blog: string;
  location: string | null;
  created_at: string;
}

export interface OrgActivitySummary {
  orgName: string;
  displayName: string;
  orgDescription: string | null;
  orgUrl: string;
  avatarUrl: string;
  publicRepoCount: number;
  totalStars: number;
  totalForks: number;
  totalOpenIssues: number;
  topLanguages: Array<{ language: string; count: number }>;
  topRepos: Array<{
    name: string;
    description: string | null;
    url: string;
    stars: number;
    forks: number;
    language: string | null;
    lastPush: string;
    topics: string[];
  }>;
  lastPushDate: string | null;
  createdAt: string;
  fetchedAt: string;
}

/**
 * Delay helper for rate limiting between API calls.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build headers for GitHub API requests.
 * Uses GITHUB_TOKEN if available for higher rate limits.
 */
function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SpaceNexus-Enrichment',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch organization details from GitHub.
 */
async function fetchOrgDetails(orgName: string): Promise<GitHubOrg | null> {
  const response = await fetch(`${GITHUB_API_URL}/orgs/${orgName}`, {
    headers: getGitHubHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    if (response.status === 404) {
      logger.warn('GitHub: Organization not found', { orgName });
      return null;
    }
    if (response.status === 403) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        throw new Error(`GitHub rate limit exceeded, resets at ${resetTime}`);
      }
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch public repos for an organization (up to 100, sorted by stars).
 */
async function fetchOrgRepos(orgName: string): Promise<GitHubRepo[]> {
  const response = await fetch(
    `${GITHUB_API_URL}/orgs/${orgName}/repos?per_page=100&sort=stars&direction=desc&type=public`,
    {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    if (response.status === 403) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        throw new Error('GitHub rate limit exceeded');
      }
    }
    throw new Error(`GitHub repos API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Compute top languages from a list of repos.
 */
function computeTopLanguages(repos: GitHubRepo[]): Array<{ language: string; count: number }> {
  const langCounts = new Map<string, number>();

  for (const repo of repos) {
    if (repo.language && !repo.archived) {
      langCounts.set(repo.language, (langCounts.get(repo.language) || 0) + 1);
    }
  }

  return Array.from(langCounts.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Fetch GitHub activity summary for a single organization.
 */
export async function fetchOrgGitHubActivity(orgName: string): Promise<OrgActivitySummary | null> {
  const org = SPACE_GITHUB_ORGS.find(
    (o) => o.orgName.toLowerCase() === orgName.toLowerCase()
  );
  const displayName = org?.displayName || orgName;

  const cacheKey = `github-activity:${orgName.toLowerCase()}`;
  const cached = apiCache.get<OrgActivitySummary>(cacheKey);
  if (cached) {
    return cached;
  }

  return githubBreaker.execute(
    async () => {
      const orgDetails = await fetchOrgDetails(orgName);
      if (!orgDetails) return null;

      // Small delay between org details and repos call
      await delay(500);

      const repos = await fetchOrgRepos(orgName);

      // Filter out archived repos for activity metrics
      const activeRepos = repos.filter((r) => !r.archived);

      const totalStars = activeRepos.reduce((sum, r) => sum + r.stargazers_count, 0);
      const totalForks = activeRepos.reduce((sum, r) => sum + r.forks_count, 0);
      const totalOpenIssues = activeRepos.reduce((sum, r) => sum + r.open_issues_count, 0);

      const topLanguages = computeTopLanguages(activeRepos);

      // Top 10 repos by stars
      const topRepos = activeRepos.slice(0, 10).map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        lastPush: r.pushed_at,
        topics: r.topics || [],
      }));

      // Find the most recent push across all repos
      const lastPushDate = activeRepos.length > 0
        ? activeRepos
            .map((r) => r.pushed_at)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null
        : null;

      const result: OrgActivitySummary = {
        orgName: orgDetails.login,
        displayName,
        orgDescription: orgDetails.description,
        orgUrl: orgDetails.html_url,
        avatarUrl: orgDetails.avatar_url,
        publicRepoCount: orgDetails.public_repos,
        totalStars,
        totalForks,
        totalOpenIssues,
        topLanguages,
        topRepos,
        lastPushDate,
        createdAt: orgDetails.created_at,
        fetchedAt: new Date().toISOString(),
      };

      // Cache for 30 minutes
      apiCache.set(cacheKey, result, CacheTTL.VERY_SLOW);

      logger.info('GitHub: Fetched org activity', {
        org: orgName,
        repos: orgDetails.public_repos,
        stars: totalStars,
      });

      return result;
    },
    null
  );
}

/**
 * Batch fetch GitHub activity for all known space organizations.
 * Includes rate limiting (2s delay between orgs) to stay within
 * the 60 req/hr unauthenticated limit (each org = 2 requests).
 */
export async function fetchAllSpaceGitHubActivity(): Promise<{
  fetched: number;
  stored: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const results: OrgActivitySummary[] = [];

  for (const org of SPACE_GITHUB_ORGS) {
    try {
      const result = await fetchOrgGitHubActivity(org.orgName);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      const msg = `GitHub: Failed to fetch ${org.displayName} (${org.orgName}): ${error instanceof Error ? error.message : String(error)}`;
      logger.error(msg);
      errors.push(msg);

      // If we hit a rate limit, stop early
      if (error instanceof Error && error.message.includes('rate limit')) {
        logger.warn('GitHub: Rate limit hit, stopping batch early', {
          fetched: results.length,
          remaining: SPACE_GITHUB_ORGS.length - results.length - errors.length,
        });
        break;
      }
    }

    // Rate limit: 2s between orgs (each org = 2 API calls)
    // With 16 orgs = 32 calls, at 2s intervals = ~64s total
    // Unauthenticated limit is 60/hr so this is within bounds for a single run
    await delay(2000);
  }

  // Store via bulkUpsertContent
  let stored = 0;
  if (results.length > 0) {
    stored = await bulkUpsertContent(
      'company-enrichment',
      results.map((r) => ({
        contentKey: `github-activity:${r.orgName.toLowerCase()}`,
        section: 'github',
        data: r,
      })),
      {
        sourceType: 'api',
        sourceUrl: 'https://api.github.com/',
      }
    );
  }

  logger.info('GitHub: Batch fetch completed', {
    fetched: results.length,
    stored,
    errors: errors.length,
  });

  return { fetched: results.length, stored, errors };
}
