import { z } from 'zod';

/**
 * Common validation schemas for SpaceNexus API
 */

// Email validation
export const emailSchema = z
  .string()
  .email('Please provide a valid email address')
  .min(1, 'Email is required')
  .max(255, 'Email is too long')
  .transform((val) => val.trim().toLowerCase());

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

// Name validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .transform((val) => val.trim());

// Pagination schemas
export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(Math.max(1, parseInt(val || '20', 10) || 20), 100)),
  offset: z
    .string()
    .optional()
    .transform((val) => Math.max(0, parseInt(val || '0', 10) || 0)),
});

// Contact form schema
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.enum(['general', 'technical', 'billing', 'partnership'], {
    message: 'Please select a valid subject',
  }),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message is too long')
    .transform((val) => val.trim()),
});

// Feature request schema
export const featureRequestSchema = z.object({
  type: z.enum(['existing_module', 'new_module'], {
    message: 'Please select a valid type',
  }),
  module: z.string().optional(),
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title is too long')
    .transform((val) => val.trim()),
  details: z
    .string()
    .min(20, 'Details must be at least 20 characters')
    .max(5000, 'Details are too long')
    .transform((val) => val.trim()),
  email: emailSchema,
});

// Help request schema
export const helpRequestSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject is too long')
    .transform((val) => val.trim()),
  details: z
    .string()
    .min(20, 'Details must be at least 20 characters')
    .max(5000, 'Details are too long')
    .transform((val) => val.trim()),
  email: emailSchema,
});

// Newsletter subscription schema
export const newsletterSubscribeSchema = z.object({
  email: emailSchema,
  name: z
    .string()
    .max(100, 'Name is too long')
    .optional()
    .transform((val) => val?.trim() || undefined),
});

// Registration schema
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    name: nameSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Verify email schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

// Slug parameter schema
export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Validate request body and return parsed data or error response
 */
export function validateBody<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors into a friendly format
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'value';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Validate search params from URL
 */
export function validateSearchParams<T extends z.ZodType>(
  schema: T,
  searchParams: URLSearchParams
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string[]> } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validateBody(schema, params);
}

// Server-side registration schema (no confirmPassword needed)
export const serverRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
});

// Company addition request schema
export const companyRequestSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name is too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description is too long')
    .transform((val) => val.trim()),
  website: z
    .string()
    .url('Please provide a valid URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  submitterEmail: emailSchema
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

// Orbital service request schema
export const orbitalServiceRequestSchema = z.object({
  email: emailSchema
    .optional()
    .or(z.literal('')),
  companyName: z
    .string()
    .max(200, 'Company name is too long')
    .optional()
    .transform((val) => val?.trim()),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category is too long')
    .transform((val) => val.trim()),
  serviceType: z
    .string()
    .max(100, 'Service type is too long')
    .optional()
    .transform((val) => val?.trim()),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description is too long')
    .transform((val) => val.trim()),
  requirements: z.unknown().optional(),
  budget: z
    .string()
    .max(200, 'Budget is too long')
    .optional()
    .transform((val) => val?.trim()),
  timeline: z
    .string()
    .max(200, 'Timeline is too long')
    .optional()
    .transform((val) => val?.trim()),
});

// Orbital service listing schema
export const orbitalServiceListingSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name is too long')
    .transform((val) => val.trim()),
  companyWebsite: z
    .string()
    .url('Please provide a valid URL')
    .optional()
    .or(z.literal('')),
  contactEmail: emailSchema,
  serviceName: z
    .string()
    .min(1, 'Service name is required')
    .max(200, 'Service name is too long')
    .transform((val) => val.trim()),
  serviceDescription: z
    .string()
    .min(10, 'Service description must be at least 10 characters')
    .max(5000, 'Service description is too long')
    .transform((val) => val.trim()),
  category: z
    .string()
    .max(100, 'Category is too long')
    .optional()
    .transform((val) => val?.trim()),
  pricingDetails: z
    .string()
    .min(1, 'Pricing details are required')
    .max(2000, 'Pricing details are too long')
    .transform((val) => val.trim()),
});

// Webhook event types
export const WEBHOOK_EVENT_TYPES = [
  'launch.upcoming',
  'launch.completed',
  'news.published',
  'alert.solar_flare',
  'company.updated',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

// Webhook subscribe schema
export const webhookSubscribeSchema = z.object({
  url: z
    .string()
    .url('Please provide a valid webhook URL')
    .max(2048, 'URL is too long'),
  events: z
    .array(
      z.enum(WEBHOOK_EVENT_TYPES, {
        message: `Invalid event type. Valid types: ${WEBHOOK_EVENT_TYPES.join(', ')}`,
      })
    )
    .min(1, 'At least one event type is required')
    .max(WEBHOOK_EVENT_TYPES.length, `Maximum ${WEBHOOK_EVENT_TYPES.length} event types`),
});

// Webhook unsubscribe (delete) schema
export const webhookUnsubscribeSchema = z.object({
  id: z.string().cuid('Invalid subscription ID format'),
});

// Valid search modules
export const SEARCH_MODULES = ['news', 'companies', 'events', 'opportunities', 'blogs'] as const;
export type SearchModule = (typeof SEARCH_MODULES)[number];

// Sort options for search
export const SEARCH_SORT_OPTIONS = ['relevance', 'date', 'title'] as const;
export type SearchSortBy = (typeof SEARCH_SORT_OPTIONS)[number];

// Search query schema
export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(200, 'Search query is too long').transform((val) => val.trim()),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(Math.max(1, parseInt(val || '5', 10) || 5), 20)),
  modules: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return SEARCH_MODULES as unknown as SearchModule[];
      const requested = val.split(',').map((m) => m.trim().toLowerCase());
      return requested.filter((m): m is SearchModule =>
        (SEARCH_MODULES as readonly string[]).includes(m)
      );
    }),
  dateFrom: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }),
  dateTo: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }),
  sortBy: z
    .enum(['relevance', 'date', 'title'])
    .optional()
    .default('relevance'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

// Stripe checkout schema
export const stripeCheckoutSchema = z.object({
  tier: z.enum(['pro', 'enterprise'], {
    message: 'Tier must be "pro" or "enterprise"',
  }),
  interval: z.enum(['month', 'year'], {
    message: 'Interval must be "month" or "year"',
  }),
});

// Company Intelligence query schema
export const companyProfileQuerySchema = z.object({
  search: z
    .string()
    .max(200, 'Search query is too long')
    .optional()
    .transform((val) => val?.trim()),
  sector: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
  status: z
    .string()
    .max(50)
    .optional()
    .transform((val) => val?.trim()),
  isPublic: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(Math.max(1, parseInt(val || '20', 10) || 20), 100)),
  offset: z
    .string()
    .optional()
    .transform((val) => Math.max(0, parseInt(val || '0', 10) || 0)),
});

// Funding round creation schema
export const fundingRoundSchema = z.object({
  date: z.string().datetime('Invalid date format'),
  amount: z.number().positive('Amount must be positive').optional().nullable(),
  currency: z.string().max(10).default('USD'),
  seriesLabel: z
    .string()
    .max(50, 'Series label is too long')
    .optional()
    .nullable()
    .transform((val) => val?.trim()),
  roundType: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => val?.trim()),
  preValuation: z.number().positive().optional().nullable(),
  postValuation: z.number().positive().optional().nullable(),
  leadInvestor: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => val?.trim()),
  investors: z
    .array(z.string().max(200))
    .optional()
    .default([]),
  source: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => val?.trim()),
  sourceUrl: z
    .string()
    .url('Invalid source URL')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  notes: z
    .string()
    .max(5000)
    .optional()
    .nullable()
    .transform((val) => val?.trim()),
});

// Personnel creation schema
export const personnelSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name is too long')
    .transform((val) => val.trim()),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title is too long')
    .transform((val) => val.trim()),
  role: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => val?.trim()),
  linkedinUrl: z
    .string()
    .url('Invalid LinkedIn URL')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  bio: z
    .string()
    .max(5000)
    .optional()
    .nullable()
    .transform((val) => val?.trim()),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  isCurrent: z.boolean().default(true),
  previousCompanies: z
    .array(z.string().max(200))
    .optional()
    .default([]),
});

// API Key management schemas
export const apiKeyCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Key name is required')
    .max(100, 'Key name is too long')
    .transform((val) => val.trim()),
});

export const apiKeyUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Key name is required')
    .max(100, 'Key name is too long')
    .transform((val) => val.trim())
    .optional(),
  isActive: z.boolean().optional(),
});

export const apiUsageQuerySchema = z.object({
  keyId: z.string().cuid('Invalid key ID format').optional(),
  period: z.enum(['day', 'week', 'month'], {
    message: 'Period must be "day", "week", or "month"',
  }).optional().default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================
// Sponsored Content & Ad Revenue Schemas
// ============================================================

// Valid ad campaign types
export const AD_CAMPAIGN_TYPES = ['banner', 'native', 'sponsored_content', 'job_listing'] as const;
export type AdCampaignType = (typeof AD_CAMPAIGN_TYPES)[number];

// Valid ad positions
export const AD_POSITIONS = ['top_banner', 'sidebar', 'in_feed', 'footer', 'interstitial'] as const;
export type AdPosition = (typeof AD_POSITIONS)[number];

// Valid ad formats
export const AD_FORMATS = ['banner_728x90', 'banner_300x250', 'native_card', 'sponsored_article'] as const;
export type AdFormat = (typeof AD_FORMATS)[number];

// Valid campaign statuses
export const AD_CAMPAIGN_STATUSES = ['draft', 'pending_review', 'active', 'paused', 'completed', 'rejected'] as const;

// Advertiser registration schema
export const advertiserRegistrationSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name is too long')
    .transform((val) => val.trim()),
  contactName: z
    .string()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name is too long')
    .transform((val) => val.trim()),
  contactEmail: emailSchema,
  website: z
    .string()
    .url('Please provide a valid URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

// Ad campaign creation schema
export const adCampaignCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(200, 'Campaign name is too long')
    .transform((val) => val.trim()),
  type: z.enum(AD_CAMPAIGN_TYPES, {
    message: `Campaign type must be one of: ${AD_CAMPAIGN_TYPES.join(', ')}`,
  }),
  budget: z
    .number()
    .positive('Budget must be positive')
    .max(1000000, 'Budget cannot exceed $1,000,000'),
  dailyBudget: z
    .number()
    .positive('Daily budget must be positive')
    .optional()
    .nullable(),
  cpmRate: z
    .number()
    .min(20, 'Minimum CPM rate is $20')
    .max(200, 'Maximum CPM rate is $200')
    .default(25),
  cpcRate: z
    .number()
    .positive('CPC rate must be positive')
    .optional()
    .nullable(),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  targetModules: z
    .array(z.string().max(100))
    .min(1, 'At least one target module is required')
    .max(20, 'Maximum 20 target modules'),
  targetTiers: z
    .array(z.enum(['free', 'pro', 'enterprise']))
    .optional()
    .default(['free']),
  priority: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .default(0),
  placements: z
    .array(
      z.object({
        position: z.enum(AD_POSITIONS, {
          message: `Position must be one of: ${AD_POSITIONS.join(', ')}`,
        }),
        format: z.enum(AD_FORMATS, {
          message: `Format must be one of: ${AD_FORMATS.join(', ')}`,
        }),
        title: z
          .string()
          .max(200, 'Title is too long')
          .optional()
          .transform((val) => val?.trim()),
        description: z
          .string()
          .max(2000, 'Description is too long')
          .optional()
          .transform((val) => val?.trim()),
        imageUrl: z
          .string()
          .url('Invalid image URL')
          .optional()
          .or(z.literal('').transform(() => undefined)),
        linkUrl: z.string().url('Link URL must be a valid URL'),
        ctaText: z
          .string()
          .max(50, 'CTA text is too long')
          .optional()
          .default('Learn More')
          .transform((val) => val.trim()),
      })
    )
    .min(1, 'At least one placement is required')
    .max(10, 'Maximum 10 placements per campaign'),
});

// Ad campaign update schema
export const adCampaignUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(200, 'Campaign name is too long')
    .transform((val) => val.trim())
    .optional(),
  status: z
    .enum(['draft', 'pending_review', 'active', 'paused', 'completed'] as const, {
      message: 'Invalid campaign status',
    })
    .optional(),
  budget: z
    .number()
    .positive('Budget must be positive')
    .max(1000000, 'Budget cannot exceed $1,000,000')
    .optional(),
  dailyBudget: z
    .number()
    .positive('Daily budget must be positive')
    .optional()
    .nullable(),
  endDate: z
    .string()
    .datetime('Invalid end date format')
    .optional(),
  priority: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),
});

// Ad impression tracking schema
export const adImpressionSchema = z.object({
  placementId: z.string().min(1, 'Placement ID is required'),
  campaignId: z.string().min(1, 'Campaign ID is required'),
  type: z.enum(['impression', 'click', 'conversion'], {
    message: 'Type must be "impression", "click", or "conversion"',
  }),
  module: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
});

// ============================================================
// Launch Day Dashboard Schemas
// ============================================================

// Chat message schema
export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(500, 'Message is too long')
    .transform((val) => val.trim()),
});

// Telemetry query schema
export const telemetryQuerySchema = z.object({
  since: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(Math.max(1, parseInt(val || '50', 10) || 50), 200)),
});

export type ChatMessageData = z.infer<typeof chatMessageSchema>;
export type TelemetryQueryParams = z.infer<typeof telemetryQuerySchema>;

// ============================================================
// Smart Alert System Schemas
// ============================================================

export const ALERT_TRIGGER_TYPES = [
  'keyword',
  'price_threshold',
  'regulatory_filing',
  'launch_status',
  'contract_award',
  'funding_round',
  'weather_severity',
] as const;

export type AlertTriggerType = (typeof ALERT_TRIGGER_TYPES)[number];

export const ALERT_CHANNELS = ['in_app', 'email', 'push', 'webhook'] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

export const ALERT_EMAIL_FREQUENCIES = ['immediate', 'daily_digest', 'weekly_digest'] as const;
export type AlertEmailFrequency = (typeof ALERT_EMAIL_FREQUENCIES)[number];

export const ALERT_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;
export type AlertPriority = (typeof ALERT_PRIORITIES)[number];

// Trigger config sub-schemas
const keywordTriggerConfigSchema = z.object({
  keywords: z
    .array(z.string().min(1).max(100))
    .min(1, 'At least one keyword is required')
    .max(20, 'Maximum 20 keywords'),
  matchType: z.enum(['any', 'all']).default('any'),
  sources: z.array(z.string()).optional(),
});

const priceThresholdConfigSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required').max(10),
  condition: z.enum(['above', 'below', 'percent_change']),
  value: z.number().positive('Value must be positive'),
});

const regulatoryFilingConfigSchema = z.object({
  agencies: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

const launchStatusConfigSchema = z.object({
  providers: z.array(z.string()).optional(),
  statusChanges: z.array(z.string()).optional(),
});

const contractAwardConfigSchema = z.object({
  agencies: z.array(z.string()).optional(),
  naicsCodes: z.array(z.string()).optional(),
  minValue: z.number().positive().optional(),
  keywords: z.array(z.string()).optional(),
});

const fundingRoundAlertConfigSchema = z.object({
  sectors: z.array(z.string()).optional(),
  minAmount: z.number().positive().optional(),
  roundTypes: z.array(z.string()).optional(),
});

const weatherSeverityConfigSchema = z.object({
  minKpIndex: z.number().min(0).max(9).optional(),
  alertTypes: z.array(z.string()).optional(),
});

// Alert rule creation schema
export const alertRuleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional()
    .transform((val) => val?.trim() || undefined),
  triggerType: z.enum(ALERT_TRIGGER_TYPES, {
    message: `Invalid trigger type. Valid types: ${ALERT_TRIGGER_TYPES.join(', ')}`,
  }),
  triggerConfig: z.union([
    keywordTriggerConfigSchema,
    priceThresholdConfigSchema,
    regulatoryFilingConfigSchema,
    launchStatusConfigSchema,
    contractAwardConfigSchema,
    fundingRoundAlertConfigSchema,
    weatherSeverityConfigSchema,
  ]),
  channels: z
    .array(
      z.enum(ALERT_CHANNELS, {
        message: `Invalid channel. Valid channels: ${ALERT_CHANNELS.join(', ')}`,
      })
    )
    .min(1, 'At least one channel is required')
    .max(ALERT_CHANNELS.length),
  emailFrequency: z.enum(ALERT_EMAIL_FREQUENCIES).optional().default('immediate'),
  priority: z.enum(ALERT_PRIORITIES).optional().default('normal'),
  cooldownMinutes: z
    .number()
    .int()
    .min(1, 'Cooldown must be at least 1 minute')
    .max(10080, 'Cooldown cannot exceed 7 days')
    .optional()
    .default(60),
});

// Alert rule update schema (partial)
export const alertRuleUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .transform((val) => val.trim())
    .optional(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .transform((val) => val?.trim() || undefined)
    .optional(),
  triggerConfig: z.union([
    keywordTriggerConfigSchema,
    priceThresholdConfigSchema,
    regulatoryFilingConfigSchema,
    launchStatusConfigSchema,
    contractAwardConfigSchema,
    fundingRoundAlertConfigSchema,
    weatherSeverityConfigSchema,
  ]).optional(),
  channels: z
    .array(
      z.enum(ALERT_CHANNELS, {
        message: `Invalid channel. Valid channels: ${ALERT_CHANNELS.join(', ')}`,
      })
    )
    .min(1, 'At least one channel is required')
    .max(ALERT_CHANNELS.length)
    .optional(),
  emailFrequency: z.enum(ALERT_EMAIL_FREQUENCIES).optional(),
  isActive: z.boolean().optional(),
  priority: z.enum(ALERT_PRIORITIES).optional(),
  cooldownMinutes: z
    .number()
    .int()
    .min(1, 'Cooldown must be at least 1 minute')
    .max(10080, 'Cooldown cannot exceed 7 days')
    .optional(),
});

// Alert delivery query schema (for GET /api/alerts/deliveries)
export const alertDeliveryQuerySchema = z.object({
  channel: z.enum(ALERT_CHANNELS).optional(),
  status: z
    .enum(['pending', 'sent', 'delivered', 'failed', 'read'])
    .optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(Math.max(1, parseInt(val || '20', 10) || 20), 100)),
  offset: z
    .string()
    .optional()
    .transform((val) => Math.max(0, parseInt(val || '0', 10) || 0)),
});

// Export types
export type ApiKeyCreateData = z.infer<typeof apiKeyCreateSchema>;
export type ApiKeyUpdateData = z.infer<typeof apiKeyUpdateSchema>;
export type ApiUsageQueryParams = z.infer<typeof apiUsageQuerySchema>;
export type StripeCheckoutData = z.infer<typeof stripeCheckoutSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
export type FeatureRequestData = z.infer<typeof featureRequestSchema>;
export type HelpRequestData = z.infer<typeof helpRequestSchema>;
export type NewsletterSubscribeData = z.infer<typeof newsletterSubscribeSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type ServerRegisterData = z.infer<typeof serverRegisterSchema>;
export type CompanyRequestData = z.infer<typeof companyRequestSchema>;
export type OrbitalServiceRequestData = z.infer<typeof orbitalServiceRequestSchema>;
export type OrbitalServiceListingData = z.infer<typeof orbitalServiceListingSchema>;
export type SearchQueryParams = z.infer<typeof searchQuerySchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailData = z.infer<typeof verifyEmailSchema>;
export type WebhookSubscribeData = z.infer<typeof webhookSubscribeSchema>;
export type WebhookUnsubscribeData = z.infer<typeof webhookUnsubscribeSchema>;
export type CompanyProfileQueryParams = z.infer<typeof companyProfileQuerySchema>;
export type FundingRoundData = z.infer<typeof fundingRoundSchema>;
export type PersonnelData = z.infer<typeof personnelSchema>;
export type AdvertiserRegistrationData = z.infer<typeof advertiserRegistrationSchema>;
export type AdCampaignCreateData = z.infer<typeof adCampaignCreateSchema>;
export type AdCampaignUpdateData = z.infer<typeof adCampaignUpdateSchema>;
export type AdImpressionData = z.infer<typeof adImpressionSchema>;
export type AlertRuleData = z.infer<typeof alertRuleSchema>;
export type AlertRuleUpdateData = z.infer<typeof alertRuleUpdateSchema>;
export type AlertDeliveryQueryParams = z.infer<typeof alertDeliveryQuerySchema>;

// ============================================================
// Procurement Intelligence Schemas
// ============================================================

// Procurement opportunities query schema
export const procurementQuerySchema = z.object({
  agency: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
  naicsCode: z
    .string()
    .max(10)
    .optional()
    .transform((val) => val?.trim()),
  setAside: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
  type: z
    .string()
    .max(50)
    .optional()
    .transform((val) => val?.trim()),
  minValue: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const n = parseFloat(val);
      return isNaN(n) ? undefined : n;
    }),
  maxValue: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const n = parseFloat(val);
      return isNaN(n) ? undefined : n;
    }),
  search: z
    .string()
    .max(200)
    .optional()
    .transform((val) => val?.trim()),
  deadlineAfter: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(Math.max(1, parseInt(val || '25', 10) || 25), 100)),
  offset: z
    .string()
    .optional()
    .transform((val) => Math.max(0, parseInt(val || '0', 10) || 0)),
});

// SBIR/STTR query schema
export const sbirQuerySchema = z.object({
  agency: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
  program: z
    .string()
    .max(10)
    .optional()
    .transform((val) => val?.trim()),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  search: z
    .string()
    .max(200)
    .optional()
    .transform((val) => val?.trim()),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(Math.max(1, parseInt(val || '25', 10) || 25), 100)),
  offset: z
    .string()
    .optional()
    .transform((val) => Math.max(0, parseInt(val || '0', 10) || 0)),
});

// Budget query schema
export const budgetQuerySchema = z.object({
  agency: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
  fiscalYear: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const n = parseInt(val, 10);
      return isNaN(n) ? undefined : n;
    }),
  category: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
});

// Saved procurement search schema
export const savedSearchSchema = z.object({
  name: z
    .string()
    .min(1, 'Search name is required')
    .max(200, 'Search name is too long')
    .transform((val) => val.trim()),
  filters: z.object({
    agencies: z.array(z.string().max(100)).optional().default([]),
    naicsCodes: z.array(z.string().max(10)).optional().default([]),
    setAsides: z.array(z.string().max(100)).optional().default([]),
    minValue: z.number().min(0).optional().nullable(),
    maxValue: z.number().min(0).optional().nullable(),
    keywords: z.string().max(500).optional().nullable(),
    types: z.array(z.string().max(50)).optional().default([]),
  }),
  alertEnabled: z.boolean().default(true),
});

// Congressional activity query schema
export const congressionalQuerySchema = z.object({
  type: z
    .string()
    .max(50)
    .optional()
    .transform((val) => val?.trim()),
  committee: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
  dateAfter: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }),
  dateBefore: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(Math.max(1, parseInt(val || '25', 10) || 25), 100)),
  offset: z
    .string()
    .optional()
    .transform((val) => Math.max(0, parseInt(val || '0', 10) || 0)),
});

export type ProcurementQueryParams = z.infer<typeof procurementQuerySchema>;
export type SBIRQueryParams = z.infer<typeof sbirQuerySchema>;
export type BudgetQueryParams = z.infer<typeof budgetQuerySchema>;
export type SavedSearchData = z.infer<typeof savedSearchSchema>;
export type CongressionalQueryParams = z.infer<typeof congressionalQuerySchema>;

// ============================================================
// Dashboard Builder Schemas
// ============================================================

// Valid widget types
export const DASHBOARD_WIDGET_TYPES = ['full', 'compact', 'chart', 'stats', 'feed'] as const;
export type DashboardWidgetType = (typeof DASHBOARD_WIDGET_TYPES)[number];

// Widget schema (for creating/updating widgets)
export const dashboardWidgetSchema = z.object({
  moduleId: z
    .string()
    .min(1, 'Module ID is required')
    .max(100, 'Module ID is too long'),
  widgetType: z.enum(DASHBOARD_WIDGET_TYPES, {
    message: `Widget type must be one of: ${DASHBOARD_WIDGET_TYPES.join(', ')}`,
  }),
  title: z
    .string()
    .max(200, 'Title is too long')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  x: z.number().int().min(0).max(11).default(0),
  y: z.number().int().min(0).max(100).default(0),
  w: z.number().int().min(1).max(12).default(6),
  h: z.number().int().min(1).max(12).default(4),
  minW: z.number().int().min(1).max(12).default(3),
  minH: z.number().int().min(1).max(12).default(2),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
  order: z.number().int().min(0).default(0),
});

// Dashboard layout creation schema
export const dashboardLayoutCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Layout name is required')
    .max(100, 'Layout name is too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  gridColumns: z.number().int().min(1).max(12).default(12),
  widgets: z.array(dashboardWidgetSchema).max(20, 'Maximum 20 widgets per layout').default([]),
});

// Dashboard layout update schema
export const dashboardLayoutUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Layout name is required')
    .max(100, 'Layout name is too long')
    .transform((val) => val.trim())
    .optional(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  gridColumns: z.number().int().min(1).max(12).optional(),
  widgets: z.array(dashboardWidgetSchema).max(20, 'Maximum 20 widgets per layout').optional(),
});

// Widget update schema (position/size/config changes)
export const dashboardWidgetUpdateSchema = z.object({
  widgetType: z.enum(DASHBOARD_WIDGET_TYPES).optional(),
  title: z
    .string()
    .max(200, 'Title is too long')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  x: z.number().int().min(0).max(11).optional(),
  y: z.number().int().min(0).max(100).optional(),
  w: z.number().int().min(1).max(12).optional(),
  h: z.number().int().min(1).max(12).optional(),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export type DashboardLayoutCreateData = z.infer<typeof dashboardLayoutCreateSchema>;
export type DashboardLayoutUpdateData = z.infer<typeof dashboardLayoutUpdateSchema>;
export type DashboardWidgetData = z.infer<typeof dashboardWidgetSchema>;
export type DashboardWidgetUpdateData = z.infer<typeof dashboardWidgetUpdateSchema>;

// ============================================================
// Marketplace Schemas
// ============================================================

const MARKETPLACE_CATEGORY_VALUES = [
  'launch', 'satellite', 'in_space', 'ground', 'manufacturing',
  'engineering', 'environment', 'rnd', 'human', 'power',
] as const;

const PRICING_TYPE_VALUES = ['fixed', 'hourly', 'per_unit', 'subscription', 'rfq_only'] as const;

// Service Listing schemas
export const serviceListingCreateSchema = z.object({
  name: z
    .string()
    .min(3, 'Service name must be at least 3 characters')
    .max(200, 'Service name is too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(10000, 'Description is too long')
    .transform((val) => val.trim()),
  category: z.enum(MARKETPLACE_CATEGORY_VALUES, {
    message: 'Please select a valid service category',
  }),
  subcategory: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim() || undefined),
  pricingType: z.enum(PRICING_TYPE_VALUES, {
    message: 'Please select a valid pricing type',
  }),
  priceMin: z.number().min(0).optional().nullable(),
  priceMax: z.number().min(0).optional().nullable(),
  priceUnit: z
    .string()
    .max(50)
    .optional()
    .transform((val) => val?.trim() || undefined),
  pricingNotes: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => val?.trim() || undefined),
  specifications: z.record(z.string(), z.unknown()).optional().nullable(),
  certifications: z
    .array(z.string().max(100))
    .optional()
    .default([]),
  pastPerformance: z
    .string()
    .max(5000)
    .optional()
    .transform((val) => val?.trim() || undefined),
  leadTime: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim() || undefined),
  capacity: z
    .string()
    .max(200)
    .optional()
    .transform((val) => val?.trim() || undefined),
  coverageArea: z
    .string()
    .max(200)
    .optional()
    .transform((val) => val?.trim() || undefined),
});

export const serviceListingUpdateSchema = serviceListingCreateSchema.partial();

// RFQ schemas
export const rfqCreateSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(300, 'Title is too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(10000, 'Description is too long')
    .transform((val) => val.trim()),
  category: z.enum(MARKETPLACE_CATEGORY_VALUES, {
    message: 'Please select a valid service category',
  }),
  subcategory: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim() || undefined),
  requirements: z.record(z.string(), z.unknown()).optional().nullable(),
  budgetMin: z.number().min(0).optional().nullable(),
  budgetMax: z.number().min(0).optional().nullable(),
  budgetCurrency: z.string().max(10).default('USD'),
  deadline: z.string().datetime().optional().nullable(),
  deliveryDate: z.string().datetime().optional().nullable(),
  complianceReqs: z
    .array(z.string().max(100))
    .optional()
    .default([]),
  isPublic: z.boolean().default(true),
});

export const rfqUpdateSchema = z.object({
  title: z.string().min(5).max(300).transform((val) => val.trim()).optional(),
  description: z.string().min(20).max(10000).transform((val) => val.trim()).optional(),
  status: z.enum(['open', 'evaluating', 'awarded', 'cancelled', 'closed']).optional(),
  awardedToCompanyId: z.string().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
});

// Proposal schemas
export const proposalCreateSchema = z.object({
  rfqId: z.string().min(1, 'RFQ ID is required'),
  price: z.number().min(0).optional().nullable(),
  pricingDetail: z
    .string()
    .max(5000)
    .optional()
    .transform((val) => val?.trim() || undefined),
  timeline: z
    .string()
    .max(500)
    .optional()
    .transform((val) => val?.trim() || undefined),
  approach: z
    .string()
    .min(20, 'Approach must be at least 20 characters')
    .max(10000, 'Approach is too long')
    .transform((val) => val.trim()),
  attachments: z.array(z.object({
    name: z.string().max(200),
    url: z.string().url(),
    type: z.string().max(50).optional(),
  })).optional().default([]),
});

export const proposalUpdateSchema = z.object({
  status: z.enum(['submitted', 'shortlisted', 'awarded', 'rejected', 'withdrawn']).optional(),
  price: z.number().min(0).optional().nullable(),
  pricingDetail: z.string().max(5000).optional(),
  timeline: z.string().max(500).optional(),
  approach: z.string().max(10000).optional(),
});

// Review schema
export const reviewCreateSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  rfqId: z.string().optional().nullable(),
  overallRating: z.number().int().min(1).max(5),
  qualityRating: z.number().int().min(1).max(5).optional().nullable(),
  timelineRating: z.number().int().min(1).max(5).optional().nullable(),
  commRating: z.number().int().min(1).max(5).optional().nullable(),
  valueRating: z.number().int().min(1).max(5).optional().nullable(),
  title: z
    .string()
    .max(200)
    .optional()
    .transform((val) => val?.trim() || undefined),
  content: z
    .string()
    .max(5000)
    .optional()
    .transform((val) => val?.trim() || undefined),
});

// Interest expression schema
export const interestExpressionSchema = z.object({
  opportunityId: z.string().min(1, 'Opportunity ID is required'),
  contactEmail: emailSchema,
  companyId: z.string().optional().nullable(),
  message: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => val?.trim() || undefined),
});

// Teaming opportunity schema
export const teamingCreateSchema = z.object({
  contractReference: z.string().max(200).optional(),
  contractTitle: z
    .string()
    .min(3, 'Contract title is required')
    .max(300)
    .transform((val) => val.trim()),
  contractAgency: z.string().max(100).optional(),
  seekingRole: z.enum(['prime', 'subcontractor', 'teammate'], {
    message: 'Please select a valid role',
  }),
  capabilitiesNeeded: z
    .array(z.string().max(200))
    .min(1, 'Please specify at least one capability needed')
    .max(20),
  capabilitiesOffered: z
    .array(z.string().max(200))
    .min(1, 'Please specify at least one capability offered')
    .max(20),
  setAsideQualifications: z
    .array(z.string().max(100))
    .optional()
    .default([]),
  description: z
    .string()
    .max(5000)
    .optional()
    .transform((val) => val?.trim() || undefined),
  contactEmail: emailSchema,
});

// Company profile claim schema
export const claimProfileSchema = z.object({
  contactEmail: emailSchema,
  verificationNote: z
    .string()
    .max(1000)
    .optional()
    .transform((val) => val?.trim() || undefined),
});

// Marketplace search schema
export const marketplaceSearchSchema = z.object({
  q: z.string().max(200).optional().transform((val) => val?.trim()),
  category: z.string().max(50).optional(),
  subcategory: z.string().max(100).optional(),
  priceMin: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  priceMax: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  certifications: z.string().optional().transform((val) => val?.split(',').filter(Boolean)),
  verificationLevel: z.string().max(50).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest']).optional().default('relevance'),
  limit: z.string().optional().transform((val) => Math.min(Math.max(1, parseInt(val || '20', 10) || 20), 100)),
  offset: z.string().optional().transform((val) => Math.max(0, parseInt(val || '0', 10) || 0)),
});

// RFQ Clarification schema
export const rfqClarificationSchema = z.object({
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(2000, 'Question is too long')
    .transform((val) => val.trim()),
  isPublic: z.boolean().default(true),
});

// RFQ Clarification answer schema
export const rfqClarificationAnswerSchema = z.object({
  answer: z
    .string()
    .min(5, 'Answer must be at least 5 characters')
    .max(5000, 'Answer is too long')
    .transform((val) => val.trim()),
  isPublic: z.boolean().optional(),
});

// Provider review response schema
export const reviewResponseSchema = z.object({
  response: z
    .string()
    .min(10, 'Response must be at least 10 characters')
    .max(2000, 'Response is too long')
    .transform((val) => val.trim()),
});

// Export marketplace types
export type ServiceListingCreateData = z.infer<typeof serviceListingCreateSchema>;
export type ServiceListingUpdateData = z.infer<typeof serviceListingUpdateSchema>;
export type RFQCreateData = z.infer<typeof rfqCreateSchema>;
export type RFQUpdateData = z.infer<typeof rfqUpdateSchema>;
export type ProposalCreateData = z.infer<typeof proposalCreateSchema>;
export type ProposalUpdateData = z.infer<typeof proposalUpdateSchema>;
export type ReviewCreateData = z.infer<typeof reviewCreateSchema>;
export type InterestExpressionData = z.infer<typeof interestExpressionSchema>;
export type TeamingCreateData = z.infer<typeof teamingCreateSchema>;
export type ClaimProfileData = z.infer<typeof claimProfileSchema>;
export type MarketplaceSearchParams = z.infer<typeof marketplaceSearchSchema>;
export type RFQClarificationData = z.infer<typeof rfqClarificationSchema>;
export type RFQClarificationAnswerData = z.infer<typeof rfqClarificationAnswerSchema>;
export type ReviewResponseData = z.infer<typeof reviewResponseSchema>;

// ============================================================
// Company Watchlists & Saved Searches
// ============================================================

export const companyWatchlistSchema = z.object({
  companyProfileId: z.string().min(1, 'Company ID is required'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  notifyNews: z.boolean().default(true),
  notifyContracts: z.boolean().default(true),
  notifyListings: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable().transform((val) => val?.trim() || null),
});

export const generalSavedSearchSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).transform((val) => val.trim()),
  searchType: z.enum(['company_directory', 'marketplace_listings', 'marketplace_rfqs']),
  filters: z.record(z.string(), z.unknown()),
  query: z.string().max(500).optional().nullable().transform((val) => val?.trim() || null),
  alertEnabled: z.boolean().default(false),
});

export type CompanyWatchlistData = z.infer<typeof companyWatchlistSchema>;
export type GeneralSavedSearchData = z.infer<typeof generalSavedSearchSchema>;

// ============================================================
// Launch Engagement
// ============================================================

export const launchPollSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(300),
  options: z.array(z.string().min(1).max(100)).min(2, 'At least 2 options').max(6, 'At most 6 options'),
});

export const launchPollVoteSchema = z.object({
  pollId: z.string().min(1, 'Poll ID is required'),
  option: z.number().int().min(0, 'Invalid option'),
});

export const launchReactionSchema = z.object({
  emoji: z.enum(['rocket', 'fire', 'star', 'heart', '100']),
  phase: z.string().max(50).optional().nullable(),
});

export type LaunchPollData = z.infer<typeof launchPollSchema>;
export type LaunchPollVoteData = z.infer<typeof launchPollVoteSchema>;
export type LaunchReactionData = z.infer<typeof launchReactionSchema>;

// ============================================================
// Contract Awards Schemas
// ============================================================

export const awardsQuerySchema = z.object({
  search: z
    .string()
    .max(200, 'Search query is too long')
    .optional()
    .transform((val) => val?.trim()),
  agency: z
    .string()
    .max(100, 'Agency name is too long')
    .optional()
    .transform((val) => val?.trim()),
  dateRange: z.coerce
    .number()
    .min(1, 'Date range must be at least 1 day')
    .max(365, 'Date range cannot exceed 365 days')
    .default(90),
  minAmount: z.coerce
    .number()
    .min(0, 'Minimum amount cannot be negative')
    .default(0),
  page: z.coerce
    .number()
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

export type AwardsQueryParams = z.infer<typeof awardsQuerySchema>;
