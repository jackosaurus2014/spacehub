import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  invalidFormatError,
  forbiddenError,
  internalError,
  constrainPagination,
  constrainOffset,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface ContactFormData {
  name: string;
  email: string;
  subject: 'general' | 'technical' | 'billing' | 'partnership';
  message: string;
}

const VALID_SUBJECTS = ['general', 'technical', 'billing', 'partnership'];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body: ContactFormData = await req.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return validationError('Name is required', { name: 'Name is required' });
    }

    if (!email || !email.trim()) {
      return validationError('Email is required', { email: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return invalidFormatError('email', 'valid email address');
    }

    if (!subject || !VALID_SUBJECTS.includes(subject)) {
      return validationError('Please select a valid subject', {
        subject: `Must be one of: ${VALID_SUBJECTS.join(', ')}`,
      });
    }

    if (!message || !message.trim()) {
      return validationError('Message is required', { message: 'Message is required' });
    }

    if (message.trim().length < 10) {
      return validationError('Message must be at least 10 characters long', {
        message: 'Minimum 10 characters required',
      });
    }

    // Create contact submission in database
    const submission = await prisma.contactSubmission.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject,
        message: message.trim(),
        userId: session?.user?.id || null,
        status: 'new',
      },
    });

    // Log for monitoring
    console.log('Contact form submission:', {
      id: submission.id,
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      messageLength: submission.message.length,
      userId: submission.userId,
      createdAt: submission.createdAt,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Your message has been received. We will get back to you soon.',
          submissionId: submission.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);
    return internalError('Failed to submit contact form. Please try again later.');
  }
}

// Admin endpoint to view submissions (requires admin auth)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return forbiddenError();
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const status = searchParams.get('status');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '50'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const where: Record<string, unknown> = {};

    if (subject && VALID_SUBJECTS.includes(subject)) {
      where.subject = subject;
    }

    if (status) {
      where.status = status;
    }

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        submissions,
        total,
        hasMore: offset + submissions.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    return internalError('Failed to fetch contact submissions');
  }
}
