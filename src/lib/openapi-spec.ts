/**
 * OpenAPI 3.0 Specification for the SpaceNexus Public API.
 *
 * This is the source-of-truth spec used by both the /api/v1/openapi.json
 * endpoint and the /developer/docs UI.
 */

export interface OpenAPIEndpoint {
  operationId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  tags: string[];
  tier: 'All' | 'Enterprise';
  parameters: EndpointParameter[];
  requestBody?: {
    description: string;
    required: boolean;
    schema: Record<string, unknown>;
  };
  responseSchema: Record<string, unknown>;
  exampleResponse: Record<string, unknown>;
  codeExamples: {
    curl: string;
    python: string;
    javascript: string;
  };
}

export interface EndpointParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  description: string;
  required: boolean;
  type: string;
  default?: string | number;
  enum?: string[];
}

export interface EndpointCategory {
  name: string;
  description: string;
  slug: string;
  endpoints: OpenAPIEndpoint[];
}

// ---------------------------------------------------------------------------
// Rate limit documentation
// ---------------------------------------------------------------------------

export const RATE_LIMIT_TIERS = [
  {
    tier: 'Developer',
    monthlyLimit: '5,000',
    perMinuteLimit: '60',
    maxKeys: 3,
    price: 'Included with Pro',
  },
  {
    tier: 'Business',
    monthlyLimit: '50,000',
    perMinuteLimit: '300',
    maxKeys: 10,
    price: 'Included with Enterprise',
  },
  {
    tier: 'Enterprise',
    monthlyLimit: 'Unlimited',
    perMinuteLimit: '1,000',
    maxKeys: 'Unlimited',
    price: 'Included with Enterprise',
  },
];

// ---------------------------------------------------------------------------
// Common error responses
// ---------------------------------------------------------------------------

export const COMMON_ERRORS = [
  {
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'Missing or invalid API key. Provide a valid key via Authorization: Bearer snx_... or X-API-Key header.',
    description: 'Returned when the API key is missing, malformed, revoked, or expired.',
  },
  {
    status: 403,
    code: 'FORBIDDEN',
    message: 'The opportunities endpoint requires an Enterprise API tier. Please upgrade your plan.',
    description: 'Returned when the endpoint requires a higher API tier than your current key.',
  },
  {
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Per-minute rate limit exceeded. Please slow down.',
    description: 'Returned when you have exceeded your per-minute or monthly rate limit. Check X-RateLimit-Reset header for retry timing.',
  },
  {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    description: 'Returned when the server encounters an unrecoverable error. Contact support if this persists.',
  },
];

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

const BASE_URL = 'https://spacenexus.us/api/v1';

// ---------------------------------------------------------------------------
// Helper to build code examples
// ---------------------------------------------------------------------------

function buildCodeExamples(
  method: string,
  path: string,
  queryParams?: Record<string, string>
): { curl: string; python: string; javascript: string } {
  const qs = queryParams
    ? '?' + Object.entries(queryParams).map(([k, v]) => `${k}=${v}`).join('&')
    : '';

  const fullUrl = `${BASE_URL}${path}${qs}`;

  const curl = `curl -X ${method} "${fullUrl}" \\
  -H "X-API-Key: snx_YOUR_API_KEY"`;

  const pythonParams = queryParams
    ? `\n    params=${JSON.stringify(queryParams, null, 8).replace(/"/g, "'")},`
    : '';

  const python = `import requests

response = requests.${method.toLowerCase()}(
    '${BASE_URL}${path}',${pythonParams}
    headers={'X-API-Key': 'snx_YOUR_API_KEY'},
)
data = response.json()
print(data['data'])`;

  const jsParams = queryParams
    ? Object.entries(queryParams).map(([k, v]) => `    url.searchParams.set('${k}', '${v}');`).join('\n') + '\n'
    : '';

  const javascript = `const url = new URL('${BASE_URL}${path}');
${jsParams}
const response = await fetch(url, {
  headers: { 'X-API-Key': 'snx_YOUR_API_KEY' },
});
const data = await response.json();
console.log(data.data);`;

  return { curl, python, javascript };
}

// ---------------------------------------------------------------------------
// Endpoint definitions by category
// ---------------------------------------------------------------------------

export const API_CATEGORIES: EndpointCategory[] = [
  // ==================== Companies ====================
  {
    name: 'Companies',
    description: 'Access profiles for space industry companies including public market data, focus areas, and employee counts.',
    slug: 'companies',
    endpoints: [
      {
        operationId: 'getCompanies',
        method: 'GET',
        path: '/companies',
        summary: 'List space company profiles',
        description:
          'Retrieve a paginated list of space company profiles. Results are ordered by public status, market cap descending, then name ascending. Focus areas and sub-sectors are returned as parsed arrays.',
        tags: ['Companies'],
        tier: 'All',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of results to return (max 100)', required: false, type: 'integer', default: 20 },
          { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, type: 'integer', default: 0 },
          { name: 'sector', in: 'query', description: 'Filter by focus area / sector keyword (e.g. "Launch Services", "Satellite Manufacturing")', required: false, type: 'string' },
          { name: 'search', in: 'query', description: 'Search by company name (case-insensitive partial match)', required: false, type: 'string' },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'Company[]',
          pagination: '{ limit, offset, total }',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'clx1abc123',
              slug: 'spacex',
              name: 'SpaceX',
              description: 'American spacecraft manufacturer and space launch provider.',
              country: 'United States',
              headquarters: 'Hawthorne, CA',
              founded: 2002,
              website: 'https://www.spacex.com',
              isPublic: false,
              ticker: null,
              exchange: null,
              marketCap: null,
              stockPrice: null,
              isPreIPO: true,
              valuation: 350000000000,
              focusAreas: ['Launch Services', 'Satellite Internet', 'Human Spaceflight'],
              subSectors: null,
              employeeCount: 13000,
            },
          ],
          pagination: { limit: 20, offset: 0, total: 101 },
        },
        codeExamples: buildCodeExamples('GET', '/companies', { limit: '10', search: 'space' }),
      },
    ],
  },

  // ==================== News ====================
  {
    name: 'News',
    description: 'Fetch space news articles aggregated from 50+ sources with category filtering.',
    slug: 'news',
    endpoints: [
      {
        operationId: 'getNews',
        method: 'GET',
        path: '/news',
        summary: 'List space news articles',
        description:
          'Retrieve a paginated list of aggregated space news articles from 50+ RSS feeds and blog sources. Articles can be filtered by category.',
        tags: ['News'],
        tier: 'All',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of results to return (max 100)', required: false, type: 'integer', default: 20 },
          { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, type: 'integer', default: 0 },
          { name: 'category', in: 'query', description: 'Filter by news category (e.g. "launch", "policy", "science", "business")', required: false, type: 'string' },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'NewsArticle[]',
          pagination: '{ limit, offset, total }',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'clx2def456',
              title: 'SpaceX Launches 23 Starlink Satellites on Falcon 9',
              summary: 'SpaceX successfully launched 23 Starlink satellites from Cape Canaveral.',
              url: 'https://example.com/article',
              source: 'SpaceNews',
              category: 'launch',
              imageUrl: 'https://example.com/image.jpg',
              publishedAt: '2026-02-20T14:30:00.000Z',
            },
          ],
          pagination: { limit: 20, offset: 0, total: 1523 },
        },
        codeExamples: buildCodeExamples('GET', '/news', { limit: '5', category: 'launch' }),
      },
    ],
  },

  // ==================== Launches ====================
  {
    name: 'Launches',
    description: 'Track upcoming orbital launches with provider filtering and launch window details.',
    slug: 'launches',
    endpoints: [
      {
        operationId: 'getLaunches',
        method: 'GET',
        path: '/launches',
        summary: 'List upcoming launches',
        description:
          'Retrieve upcoming orbital launches sorted by launch date ascending. Only launches with status "upcoming", "go", "tbc", or "tbd" and a future launch date are returned.',
        tags: ['Launches'],
        tier: 'All',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of results to return (max 100)', required: false, type: 'integer', default: 20 },
          { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, type: 'integer', default: 0 },
          { name: 'provider', in: 'query', description: 'Filter by launch provider / agency name (case-insensitive partial match)', required: false, type: 'string' },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'Launch[]',
          pagination: '{ limit, offset, total }',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'clx3ghi789',
              name: 'Falcon 9 | Starlink Group 12-3',
              type: 'Normal',
              status: 'go',
              launchDate: '2026-02-25T18:00:00.000Z',
              agency: 'SpaceX',
              location: 'Cape Canaveral SFS, FL, USA',
              mission: 'Starlink Group 12-3',
              description: 'SpaceX Falcon 9 launch carrying Starlink satellites.',
              country: 'USA',
              rocket: 'Falcon 9 Block 5',
              windowStart: '2026-02-25T18:00:00.000Z',
              windowEnd: '2026-02-25T22:00:00.000Z',
              launchDatePrecision: 'hour',
            },
          ],
          pagination: { limit: 20, offset: 0, total: 47 },
        },
        codeExamples: buildCodeExamples('GET', '/launches', { limit: '5', provider: 'SpaceX' }),
      },
    ],
  },

  // ==================== Market ====================
  {
    name: 'Market',
    description: 'Access stock market data for publicly traded space companies.',
    slug: 'market',
    endpoints: [
      {
        operationId: 'getMarketData',
        method: 'GET',
        path: '/market',
        summary: 'Get space market / stock data',
        description:
          'Retrieve stock market data for publicly traded space companies. Without a ticker parameter, returns all public companies sorted by market cap. With a ticker, returns data for a single company.',
        tags: ['Market'],
        tier: 'All',
        parameters: [
          { name: 'ticker', in: 'query', description: 'Company ticker symbol (e.g. "RKLB", "SPCE"). If omitted, returns all public companies.', required: false, type: 'string' },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'MarketData | MarketData[]',
          pagination: '{ limit, offset, total } (only when no ticker specified)',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'clx4jkl012',
              name: 'Rocket Lab USA',
              ticker: 'RKLB',
              exchange: 'NASDAQ',
              marketCap: 12500000000,
              stockPrice: 26.75,
              priceChange24h: 1.23,
              country: 'United States',
            },
          ],
          pagination: { limit: 25, offset: 0, total: 25 },
        },
        codeExamples: buildCodeExamples('GET', '/market', { ticker: 'RKLB' }),
      },
    ],
  },

  // ==================== Satellites ====================
  {
    name: 'Satellites',
    description: 'Query satellite catalog data with orbit type, operator, and status filtering.',
    slug: 'satellites',
    endpoints: [
      {
        operationId: 'getSatellites',
        method: 'GET',
        path: '/satellites',
        summary: 'List satellite data',
        description:
          'Retrieve satellite catalog data. Default limit is 50 (max 200). Supports filtering by orbit type, operator, and operational status.',
        tags: ['Satellites'],
        tier: 'All',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of results to return (max 200)', required: false, type: 'integer', default: 50 },
          { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, type: 'integer', default: 0 },
          { name: 'orbitType', in: 'query', description: 'Filter by orbit type', required: false, type: 'string', enum: ['LEO', 'MEO', 'GEO', 'HEO', 'SSO', 'Polar'] },
          { name: 'operator', in: 'query', description: 'Filter by satellite operator (case-insensitive partial match)', required: false, type: 'string' },
          { name: 'status', in: 'query', description: 'Filter by operational status', required: false, type: 'string', enum: ['active', 'inactive', 'deorbited'] },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'Satellite[]',
          pagination: '{ limit, offset, total }',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'sat-001',
              name: 'Starlink-5001',
              noradId: '58001',
              orbitType: 'LEO',
              altitude: 550,
              velocity: 7.59,
              operator: 'SpaceX',
              country: 'United States',
              launchDate: '2025-06-15',
              status: 'active',
              purpose: 'Communications',
              mass: 295,
              period: 95.7,
              inclination: 53.2,
              apogee: 555,
              perigee: 545,
              description: 'Starlink broadband satellite.',
            },
          ],
          pagination: { limit: 50, offset: 0, total: 8420 },
        },
        codeExamples: buildCodeExamples('GET', '/satellites', { limit: '10', orbitType: 'GEO' }),
      },
    ],
  },

  // ==================== Regulatory ====================
  {
    name: 'Compliance',
    description: 'Track proposed regulations, policy changes, and comment deadlines from space regulatory agencies.',
    slug: 'regulatory',
    endpoints: [
      {
        operationId: 'getRegulatory',
        method: 'GET',
        path: '/regulatory',
        summary: 'List regulatory data',
        description:
          'Retrieve proposed regulations and policy changes relevant to the space industry. Results are ordered by published date descending.',
        tags: ['Regulatory'],
        tier: 'All',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of results to return (max 100)', required: false, type: 'integer', default: 20 },
          { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, type: 'integer', default: 0 },
          { name: 'category', in: 'query', description: 'Filter by regulation category', required: false, type: 'string' },
          { name: 'agency', in: 'query', description: 'Filter by issuing agency (e.g. "FAA", "FCC", "NOAA")', required: false, type: 'string' },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'Regulation[]',
          pagination: '{ limit, offset, total }',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'clx5mno345',
              slug: 'faa-orbital-debris-mitigation-2026',
              title: 'FAA Orbital Debris Mitigation Requirements Update',
              summary: 'Proposed rule updating post-mission disposal requirements for commercial launch operators.',
              agency: 'FAA',
              type: 'Proposed Rule',
              category: 'Debris Mitigation',
              impactSeverity: 'high',
              publishedDate: '2026-01-15T00:00:00.000Z',
              commentDeadline: '2026-04-15T00:00:00.000Z',
              effectiveDate: null,
              status: 'Open for Comment',
              sourceUrl: 'https://www.federalregister.gov/example',
            },
          ],
          pagination: { limit: 20, offset: 0, total: 34 },
        },
        codeExamples: buildCodeExamples('GET', '/regulatory', { agency: 'FAA', limit: '10' }),
      },
    ],
  },

  // ==================== Contracts ====================
  {
    name: 'Procurement',
    description: 'Access government contracts, RFPs, and awards from NASA, USSF, DARPA, and other agencies.',
    slug: 'contracts',
    endpoints: [
      {
        operationId: 'getContracts',
        method: 'GET',
        path: '/contracts',
        summary: 'List government contracts',
        description:
          'Retrieve government contracts and procurement opportunities from space-related agencies. Supports filtering by agency, contract type, status, and category.',
        tags: ['Contracts'],
        tier: 'All',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of results to return (max 100)', required: false, type: 'integer', default: 20 },
          { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, type: 'integer', default: 0 },
          { name: 'agency', in: 'query', description: 'Filter by agency (e.g. "NASA", "USSF", "DARPA", "NRO")', required: false, type: 'string' },
          { name: 'type', in: 'query', description: 'Filter by contract type (e.g. "RFP", "RFI", "Award", "BAA")', required: false, type: 'string' },
          { name: 'status', in: 'query', description: 'Filter by contract status (e.g. "open", "closed", "awarded")', required: false, type: 'string' },
          { name: 'category', in: 'query', description: 'Filter by contract category', required: false, type: 'string' },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'Contract[]',
          pagination: '{ limit, offset, total }',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'clx6pqr678',
              slug: 'nasa-cislunar-comm-services-2026',
              title: 'Cislunar Communication Services',
              agency: 'NASA',
              type: 'RFP',
              value: '$150M',
              status: 'open',
              postedDate: '2026-02-01T00:00:00.000Z',
              dueDate: '2026-05-01T00:00:00.000Z',
            },
          ],
          pagination: { limit: 20, offset: 0, total: 67 },
        },
        codeExamples: buildCodeExamples('GET', '/contracts', { agency: 'NASA', status: 'open' }),
      },
    ],
  },

  // ==================== Launch Vehicles ====================
  {
    name: 'Launch Vehicles',
    description: 'Compare launch vehicle specifications including cost-per-kg, payload capacity, and reusability.',
    slug: 'launch-vehicles',
    endpoints: [
      {
        operationId: 'getLaunchVehicles',
        method: 'GET',
        path: '/launch-vehicles',
        summary: 'List launch vehicle specifications',
        description:
          'Retrieve launch vehicle specifications sorted by cost per kg to LEO ascending. Includes payload capacity, cost estimates to various orbits, and reusability status.',
        tags: ['Launch Vehicles'],
        tier: 'All',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of results to return (max 100)', required: false, type: 'integer', default: 20 },
          { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, type: 'integer', default: 0 },
          { name: 'status', in: 'query', description: 'Filter by vehicle status (e.g. "operational", "development", "retired")', required: false, type: 'string' },
          { name: 'country', in: 'query', description: 'Filter by country code (e.g. "US", "CN", "EU")', required: false, type: 'string' },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'LaunchVehicle[]',
          pagination: '{ limit, offset, total }',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'clx7stu901',
              slug: 'falcon-9',
              name: 'SpaceX',
              vehicle: 'Falcon 9 Block 5',
              costPerKgToLEO: 2720,
              costPerKgToGEO: 7500,
              costPerKgToMoon: null,
              costPerKgToMars: null,
              payloadToLEO: 22800,
              status: 'operational',
              country: 'US',
              reusable: true,
            },
          ],
          pagination: { limit: 20, offset: 0, total: 35 },
        },
        codeExamples: buildCodeExamples('GET', '/launch-vehicles', { status: 'operational', limit: '10' }),
      },
    ],
  },

  // ==================== Space Weather ====================
  {
    name: 'Weather',
    description: 'Real-time space weather data including solar wind speed, geomagnetic indices, and forecasts from NOAA.',
    slug: 'space-weather',
    endpoints: [
      {
        operationId: 'getSpaceWeather',
        method: 'GET',
        path: '/space-weather',
        summary: 'Get space weather conditions',
        description:
          'Retrieve current space weather conditions and forecasts sourced from NOAA. Includes solar wind data, geomagnetic activity indices (Kp, Dst), solar flare alerts, and 3-day forecasts. No pagination parameters -- returns a single summary object.',
        tags: ['Space Weather'],
        tier: 'All',
        parameters: [],
        responseSchema: {
          success: 'boolean',
          data: 'SpaceWeatherSummary',
        },
        exampleResponse: {
          success: true,
          data: {
            solarWind: {
              speed: 425.3,
              density: 4.2,
              bz: -2.1,
              timestamp: '2026-02-20T15:00:00.000Z',
            },
            geomagneticActivity: {
              kpIndex: 3,
              kpText: 'Unsettled',
              dstIndex: -15,
            },
            solarFlares: {
              last24h: 2,
              maxClass: 'C2.4',
            },
            forecast: {
              next24h: 'Minor geomagnetic activity possible.',
              next3days: 'G1 storm watch in effect for Feb 22.',
            },
          },
        },
        codeExamples: buildCodeExamples('GET', '/space-weather'),
      },
    ],
  },

  // ==================== Opportunities (Enterprise) ====================
  {
    name: 'Opportunities',
    description: 'Enterprise-only endpoint for business opportunities, partnerships, and investment leads in the space sector.',
    slug: 'opportunities',
    endpoints: [
      {
        operationId: 'getOpportunities',
        method: 'GET',
        path: '/opportunities',
        summary: 'List business opportunities (Enterprise only)',
        description:
          'Retrieve business opportunities in the space industry. This endpoint requires an Enterprise API tier -- Developer and Business tiers will receive a 403 Forbidden response.',
        tags: ['Opportunities'],
        tier: 'Enterprise',
        parameters: [
          { name: 'limit', in: 'query', description: 'Number of results to return (max 100)', required: false, type: 'integer', default: 20 },
          { name: 'offset', in: 'query', description: 'Number of results to skip for pagination', required: false, type: 'integer', default: 0 },
          { name: 'type', in: 'query', description: 'Filter by opportunity type', required: false, type: 'string' },
          { name: 'category', in: 'query', description: 'Filter by category', required: false, type: 'string' },
          { name: 'sector', in: 'query', description: 'Filter by sector', required: false, type: 'string' },
        ],
        responseSchema: {
          success: 'boolean',
          data: 'Opportunity[]',
          pagination: '{ limit, offset, total }',
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'clx8vwx234',
              slug: 'cislunar-logistics-partnership',
              title: 'Cislunar Logistics Partnership Opportunity',
              description: 'Seeking partners for a cislunar cargo delivery service launching Q4 2027.',
              type: 'Partnership',
              category: 'Transportation',
              estimatedValue: '$25M - $50M',
              status: 'Open',
            },
          ],
          pagination: { limit: 20, offset: 0, total: 12 },
        },
        codeExamples: buildCodeExamples('GET', '/opportunities', { type: 'Partnership', limit: '10' }),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Flat list of all endpoints (convenience export)
// ---------------------------------------------------------------------------

export const ALL_ENDPOINTS: OpenAPIEndpoint[] = API_CATEGORIES.flatMap((cat) => cat.endpoints);

// ---------------------------------------------------------------------------
// Full OpenAPI 3.0 JSON spec (for /api/v1/openapi.json)
// ---------------------------------------------------------------------------

export const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'SpaceNexus Public API',
    description:
      'Access space industry data including news, launches, companies, satellites, regulatory information, market data, space weather, government contracts, launch vehicles, and business opportunities. All endpoints require API key authentication.',
    version: '1.0.0',
    termsOfService: '/terms',
    contact: {
      name: 'SpaceNexus API Support',
      url: 'https://spacenexus.us/developer',
      email: 'api@spacenexus.us',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'https://spacenexus.us/api/v1',
      description: 'Production',
    },
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development',
    },
  ],
  security: [{ BearerAuth: [] }, { ApiKeyHeader: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key passed as Bearer token: Authorization: Bearer snx_...',
      },
      ApiKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key passed via X-API-Key header',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'UNAUTHORIZED' },
              message: { type: 'string', example: 'Invalid API key.' },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          limit: { type: 'integer', example: 20 },
          offset: { type: 'integer', example: 0 },
          total: { type: 'integer', example: 150 },
        },
      },
      NewsArticle: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string', nullable: true },
          url: { type: 'string' },
          source: { type: 'string' },
          category: { type: 'string' },
          imageUrl: { type: 'string', nullable: true },
          publishedAt: { type: 'string', format: 'date-time' },
        },
      },
      Launch: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          status: { type: 'string' },
          launchDate: { type: 'string', format: 'date-time', nullable: true },
          agency: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          mission: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          rocket: { type: 'string', nullable: true },
          country: { type: 'string', nullable: true },
          windowStart: { type: 'string', format: 'date-time', nullable: true },
          windowEnd: { type: 'string', format: 'date-time', nullable: true },
          launchDatePrecision: { type: 'string', nullable: true },
        },
      },
      Company: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          country: { type: 'string' },
          headquarters: { type: 'string', nullable: true },
          founded: { type: 'integer', nullable: true },
          website: { type: 'string', nullable: true },
          isPublic: { type: 'boolean' },
          ticker: { type: 'string', nullable: true },
          exchange: { type: 'string', nullable: true },
          marketCap: { type: 'number', nullable: true },
          stockPrice: { type: 'number', nullable: true },
          isPreIPO: { type: 'boolean' },
          valuation: { type: 'number', nullable: true },
          focusAreas: { type: 'array', items: { type: 'string' } },
          subSectors: { type: 'array', items: { type: 'string' }, nullable: true },
          employeeCount: { type: 'integer', nullable: true },
        },
      },
      Satellite: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          noradId: { type: 'string' },
          orbitType: { type: 'string', enum: ['LEO', 'MEO', 'GEO', 'HEO', 'SSO', 'Polar'] },
          altitude: { type: 'number' },
          velocity: { type: 'number' },
          operator: { type: 'string' },
          country: { type: 'string' },
          launchDate: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'deorbited'] },
          purpose: { type: 'string' },
          mass: { type: 'number', nullable: true },
          period: { type: 'number', nullable: true },
          inclination: { type: 'number', nullable: true },
          apogee: { type: 'number', nullable: true },
          perigee: { type: 'number', nullable: true },
          description: { type: 'string', nullable: true },
        },
      },
      Regulation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          agency: { type: 'string' },
          type: { type: 'string' },
          category: { type: 'string' },
          impactSeverity: { type: 'string' },
          publishedDate: { type: 'string', format: 'date-time' },
          commentDeadline: { type: 'string', format: 'date-time', nullable: true },
          effectiveDate: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string' },
          sourceUrl: { type: 'string' },
        },
      },
      MarketData: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          ticker: { type: 'string', nullable: true },
          exchange: { type: 'string', nullable: true },
          marketCap: { type: 'number', nullable: true },
          stockPrice: { type: 'number', nullable: true },
          priceChange24h: { type: 'number', nullable: true },
          country: { type: 'string' },
        },
      },
      Contract: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          title: { type: 'string' },
          agency: { type: 'string' },
          type: { type: 'string' },
          value: { type: 'string', nullable: true },
          status: { type: 'string' },
          postedDate: { type: 'string', format: 'date-time' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      LaunchVehicle: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          name: { type: 'string' },
          vehicle: { type: 'string' },
          costPerKgToLEO: { type: 'number' },
          costPerKgToGEO: { type: 'number', nullable: true },
          costPerKgToMoon: { type: 'number', nullable: true },
          costPerKgToMars: { type: 'number', nullable: true },
          payloadToLEO: { type: 'number', nullable: true },
          status: { type: 'string' },
          country: { type: 'string' },
          reusable: { type: 'boolean' },
        },
      },
      Opportunity: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string' },
          category: { type: 'string' },
          estimatedValue: { type: 'string', nullable: true },
          status: { type: 'string' },
        },
      },
      SpaceWeatherSummary: {
        type: 'object',
        properties: {
          solarWind: {
            type: 'object',
            properties: {
              speed: { type: 'number' },
              density: { type: 'number' },
              bz: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          geomagneticActivity: {
            type: 'object',
            properties: {
              kpIndex: { type: 'number' },
              kpText: { type: 'string' },
              dstIndex: { type: 'number' },
            },
          },
          solarFlares: {
            type: 'object',
            properties: {
              last24h: { type: 'integer' },
              maxClass: { type: 'string' },
            },
          },
          forecast: {
            type: 'object',
            properties: {
              next24h: { type: 'string' },
              next3days: { type: 'string' },
            },
          },
        },
      },
    },
    parameters: {
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of results to return (max 100)',
        schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
      },
      OffsetParam: {
        name: 'offset',
        in: 'query',
        description: 'Number of results to skip',
        schema: { type: 'integer', default: 0, minimum: 0 },
      },
    },
  },
  paths: Object.fromEntries(
    ALL_ENDPOINTS.map((ep) => [
      ep.path,
      {
        [ep.method.toLowerCase()]: {
          operationId: ep.operationId,
          summary: ep.summary,
          description: ep.description,
          tags: ep.tags,
          parameters: ep.parameters.map((p) => ({
            name: p.name,
            in: p.in,
            description: p.description,
            required: p.required,
            schema: {
              type: p.type,
              ...(p.default !== undefined ? { default: p.default } : {}),
              ...(p.enum ? { enum: p.enum } : {}),
            },
          })),
          responses: {
            200: {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { type: 'object' },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Invalid or missing API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            429: {
              description: 'Rate limit exceeded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            ...(ep.tier === 'Enterprise'
              ? {
                  403: {
                    description: 'Enterprise tier required',
                    content: {
                      'application/json': {
                        schema: { $ref: '#/components/schemas/Error' },
                      },
                    },
                  },
                }
              : {}),
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
    ])
  ),
};
