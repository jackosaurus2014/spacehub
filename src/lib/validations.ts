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
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

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

// Export types
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
