import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set - admin notifications disabled');
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <newsletter@spacenexus.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@spacenexus.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, companyWebsite, contactEmail, serviceName, serviceDescription, category, pricingDetails } = body;

    // Validate required fields
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    if (!contactEmail || typeof contactEmail !== 'string' || !contactEmail.trim()) {
      return NextResponse.json({ error: 'Contact email is required' }, { status: 400 });
    }

    if (!serviceName || typeof serviceName !== 'string' || !serviceName.trim()) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    if (!serviceDescription || typeof serviceDescription !== 'string' || !serviceDescription.trim()) {
      return NextResponse.json({ error: 'Service description is required' }, { status: 400 });
    }

    if (!pricingDetails || typeof pricingDetails !== 'string' || !pricingDetails.trim()) {
      return NextResponse.json({ error: 'Pricing details are required' }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate URL if provided
    if (companyWebsite) {
      try {
        new URL(companyWebsite);
      } catch {
        return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
      }
    }

    // Check for duplicate pending requests
    const existingRequest = await prisma.orbitalServiceListing.findFirst({
      where: {
        companyName: {
          equals: companyName.trim(),
          mode: 'insensitive',
        },
        serviceName: {
          equals: serviceName.trim(),
          mode: 'insensitive',
        },
        status: 'pending',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A listing request for this service is already pending review' },
        { status: 409 }
      );
    }

    // Create the listing request
    const listingRequest = await prisma.orbitalServiceListing.create({
      data: {
        companyName: companyName.trim(),
        companyWebsite: companyWebsite?.trim() || null,
        contactEmail: contactEmail.trim(),
        serviceName: serviceName.trim(),
        serviceDescription: serviceDescription.trim(),
        category: category?.trim() || null,
        pricingDetails: pricingDetails.trim(),
      },
    });

    // Send email notification to admin
    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `[SpaceNexus] New Service Listing Request: ${serviceName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; padding: 24px; border-radius: 12px;">
              <h1 style="color: #8b5cf6; margin-bottom: 24px;">New Service Listing Request</h1>

              <div style="background: #1a1a3e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px;">Company Information</h2>

                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Company:</strong> ${companyName}
                </p>

                ${companyWebsite ? `
                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Website:</strong>
                  <a href="${companyWebsite}" style="color: #8b5cf6;">${companyWebsite}</a>
                </p>
                ` : ''}

                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Contact Email:</strong>
                  <a href="mailto:${contactEmail}" style="color: #8b5cf6;">${contactEmail}</a>
                </p>
              </div>

              <div style="background: #1a1a3e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px;">Service Details</h2>

                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Service Name:</strong> ${serviceName}
                </p>

                ${category ? `
                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Category:</strong> ${category}
                </p>
                ` : ''}

                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Description:</strong><br/>
                  ${serviceDescription}
                </p>

                <p style="color: #a0a0b8; margin: 8px 0;">
                  <strong style="color: #c0c0d8;">Pricing:</strong><br/>
                  ${pricingDetails}
                </p>
              </div>

              <p style="color: #808090; font-size: 12px; margin-top: 24px;">
                Request ID: ${listingRequest.id}<br/>
                Submitted at: ${new Date().toISOString()}
              </p>
            </div>
          `,
          text: `
New Service Listing Request

Company Information:
- Company: ${companyName}
- Website: ${companyWebsite || 'Not provided'}
- Contact Email: ${contactEmail}

Service Details:
- Service Name: ${serviceName}
- Category: ${category || 'Not specified'}
- Description: ${serviceDescription}
- Pricing: ${pricingDetails}

Request ID: ${listingRequest.id}
Submitted at: ${new Date().toISOString()}
          `,
        });
        console.log('Admin notification sent for service listing:', listingRequest.id);
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error('Failed to send admin notification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Service listing request submitted successfully',
      id: listingRequest.id,
    });
  } catch (error) {
    console.error('Error creating service listing request:', error);
    return NextResponse.json(
      { error: 'Failed to submit service listing request' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve listing requests (admin only in future)
export async function GET() {
  try {
    const requests = await prisma.orbitalServiceListing.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching service listing requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service listing requests' },
      { status: 500 }
    );
  }
}
