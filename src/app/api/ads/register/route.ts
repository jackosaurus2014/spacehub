import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  alreadyExistsError,
  internalError,
} from '@/lib/errors';
import { advertiserRegistrationSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ads/register
 *
 * Register as an advertiser. Auth required.
 * Creates an Advertiser record in "pending" status.
 * Admin must approve before campaigns can be created.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Check if user already has an advertiser profile
    const existing = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (existing) {
      return alreadyExistsError('Advertiser profile');
    }

    const body = await req.json();
    const validation = validateBody(advertiserRegistrationSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { companyName, contactName, contactEmail, website } = validation.data;

    const advertiser = await prisma.advertiser.create({
      data: {
        userId: session.user.id,
        companyName,
        contactName,
        contactEmail,
        website: website || null,
        status: 'pending',
      },
    });

    logger.info('Advertiser registration', {
      advertiserId: advertiser.id,
      userId: session.user.id,
      companyName,
      contactEmail,
    });

    // Attempt to send admin notification email (non-blocking)
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SpaceNexus <noreply@spacenexus.io>',
          to: adminEmail,
          subject: `New Advertiser Registration: ${companyName}`,
          html: `
            <h2>New Advertiser Registration</h2>
            <p><strong>Company:</strong> ${companyName}</p>
            <p><strong>Contact:</strong> ${contactName}</p>
            <p><strong>Email:</strong> ${contactEmail}</p>
            <p><strong>Website:</strong> ${website || 'N/A'}</p>
            <p><strong>Status:</strong> Pending Review</p>
            <br/>
            <p>Please review and approve/reject this advertiser in the admin dashboard.</p>
          `,
        });
      }
    } catch (emailError) {
      logger.warn('Failed to send advertiser registration notification email', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Advertiser registration submitted. You will be notified once approved.',
          advertiserId: advertiser.id,
          status: advertiser.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error registering advertiser', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to register as advertiser');
  }
}

/**
 * GET /api/ads/register
 *
 * Get the current user's advertiser profile status.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        contactEmail: true,
        website: true,
        logoUrl: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: advertiser,
    });
  } catch (error) {
    logger.error('Error fetching advertiser profile', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch advertiser profile');
  }
}
