import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const submissionSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(200),
  contactName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Valid email is required'),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().min(10, 'Please provide at least 10 characters').max(2000),
  pricing: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = submissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const submission = await prisma.serviceProviderSubmission.create({
      data: {
        businessName: data.businessName,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email,
        website: data.website || null,
        description: data.description,
        pricing: data.pricing || null,
      },
    });

    // Send admin notification email
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      if (process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SpaceNexus <noreply@spacenexus.com>',
          to: process.env.ADMIN_EMAIL,
          subject: `New Service Provider Submission: ${data.businessName}`,
          html: `
            <h2>New Service Provider Submission</h2>
            <table style="border-collapse: collapse; width: 100%;">
              <tr><td style="padding: 8px; font-weight: bold;">Business Name:</td><td style="padding: 8px;">${data.businessName}</td></tr>
              ${data.contactName ? `<tr><td style="padding: 8px; font-weight: bold;">Contact Name:</td><td style="padding: 8px;">${data.contactName}</td></tr>` : ''}
              <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${data.email}</td></tr>
              ${data.phone ? `<tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">${data.phone}</td></tr>` : ''}
              ${data.website ? `<tr><td style="padding: 8px; font-weight: bold;">Website:</td><td style="padding: 8px;">${data.website}</td></tr>` : ''}
              <tr><td style="padding: 8px; font-weight: bold;">Description:</td><td style="padding: 8px;">${data.description}</td></tr>
              ${data.pricing ? `<tr><td style="padding: 8px; font-weight: bold;">Pricing:</td><td style="padding: 8px;">${data.pricing}</td></tr>` : ''}
            </table>
          `,
        });
      }
    } catch (emailError) {
      logger.error('Failed to send admin notification email', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
      // Don't fail the submission if email fails
    }

    logger.info('Service provider submission created', { id: submission.id, businessName: data.businessName });

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
  } catch (error) {
    logger.error('Service provider submission failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
