import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'SpaceNexus Public API',
    description:
      'Access space industry data including news, launches, companies, satellites, regulatory information, market data, space weather, government contracts, launch vehicles, and business opportunities. All endpoints require API key authentication.',
    version: '1.0.0',
    termsOfService: '/terms',
    contact: {
      name: 'SpaceNexus API Support',
      url: '/developer',
      email: 'api@spacenexus.io',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'https://spacenexus.io/api/v1',
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
          rocket: { type: 'string', nullable: true },
          country: { type: 'string', nullable: true },
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
          isPublic: { type: 'boolean' },
          ticker: { type: 'string', nullable: true },
          marketCap: { type: 'number', nullable: true },
          focusAreas: { type: 'array', items: { type: 'string' } },
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
          operator: { type: 'string' },
          country: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'deorbited'] },
          purpose: { type: 'string' },
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
          status: { type: 'string' },
          publishedDate: { type: 'string', format: 'date-time' },
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
  paths: {
    '/news': {
      get: {
        summary: 'Get space news articles',
        tags: ['News'],
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          {
            name: 'category',
            in: 'query',
            description: 'Filter by news category',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of news articles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/NewsArticle' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid or missing API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/launches': {
      get: {
        summary: 'Get upcoming launches',
        tags: ['Launches'],
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          {
            name: 'provider',
            in: 'query',
            description: 'Filter by launch provider name',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of upcoming launches',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Launch' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/companies': {
      get: {
        summary: 'Get space company profiles',
        tags: ['Companies'],
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { name: 'sector', in: 'query', description: 'Filter by focus sector', schema: { type: 'string' } },
          { name: 'search', in: 'query', description: 'Search by company name', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of companies',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Company' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/satellites': {
      get: {
        summary: 'Get satellite data',
        tags: ['Satellites'],
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { name: 'orbitType', in: 'query', description: 'Filter by orbit type', schema: { type: 'string', enum: ['LEO', 'MEO', 'GEO', 'HEO', 'SSO', 'Polar'] } },
          { name: 'operator', in: 'query', description: 'Filter by operator name', schema: { type: 'string' } },
          { name: 'status', in: 'query', description: 'Filter by status', schema: { type: 'string', enum: ['active', 'inactive', 'deorbited'] } },
        ],
        responses: {
          200: {
            description: 'List of satellites',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Satellite' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/regulatory': {
      get: {
        summary: 'Get regulatory data',
        tags: ['Regulatory'],
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { name: 'category', in: 'query', description: 'Filter by category', schema: { type: 'string' } },
          { name: 'agency', in: 'query', description: 'Filter by agency', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of regulations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Regulation' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/market': {
      get: {
        summary: 'Get space market/stock data',
        tags: ['Market'],
        parameters: [
          { name: 'ticker', in: 'query', description: 'Company ticker symbol (e.g., RKLB, SPCE)', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Market data for space companies',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      oneOf: [
                        { $ref: '#/components/schemas/MarketData' },
                        { type: 'array', items: { $ref: '#/components/schemas/MarketData' } },
                      ],
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/space-weather': {
      get: {
        summary: 'Get space weather data',
        tags: ['Space Weather'],
        responses: {
          200: {
            description: 'Current space weather conditions and forecasts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object', description: 'Space weather summary including solar wind, geomagnetic activity, and forecasts' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/contracts': {
      get: {
        summary: 'Get government contracts',
        tags: ['Contracts'],
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { name: 'agency', in: 'query', description: 'Filter by agency (NASA, USSF, etc.)', schema: { type: 'string' } },
          { name: 'type', in: 'query', description: 'Filter by type (RFP, RFI, Award)', schema: { type: 'string' } },
          { name: 'status', in: 'query', description: 'Filter by status', schema: { type: 'string' } },
          { name: 'category', in: 'query', description: 'Filter by category', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of government contracts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Contract' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/launch-vehicles': {
      get: {
        summary: 'Get launch vehicle specifications',
        tags: ['Launch Vehicles'],
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { name: 'status', in: 'query', description: 'Filter by status (operational, development, retired)', schema: { type: 'string' } },
          { name: 'country', in: 'query', description: 'Filter by country code', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of launch vehicles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/LaunchVehicle' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/opportunities': {
      get: {
        summary: 'Get business opportunities (Enterprise only)',
        tags: ['Opportunities'],
        description: 'Access business opportunities in the space industry. This endpoint requires an Enterprise API tier.',
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { name: 'type', in: 'query', description: 'Filter by opportunity type', schema: { type: 'string' } },
          { name: 'category', in: 'query', description: 'Filter by category', schema: { type: 'string' } },
          { name: 'sector', in: 'query', description: 'Filter by sector', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of business opportunities',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Opportunity' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Enterprise tier required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
};

/**
 * GET /api/v1/openapi.json
 * Returns the OpenAPI 3.0 specification for the SpaceNexus public API.
 * No authentication required for the spec itself.
 */
export async function GET() {
  return NextResponse.json(OPENAPI_SPEC, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
