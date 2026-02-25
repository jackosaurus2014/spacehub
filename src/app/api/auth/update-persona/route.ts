import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

const VALID_PERSONAS = [
  'investor',
  'entrepreneur',
  'mission-planner',
  'executive',
  'supply-chain',
  'legal',
] as const;

const updatePersonaSchema = z.object({
  persona: z.enum(VALID_PERSONAS).optional(),
  onboardingStep: z.number().int().min(0).max(10).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    // Use `as any` for select because persona/onboarding fields may not be
    // in the generated Prisma client yet (Windows EPERM on prisma generate)
    const user = await (prisma.user.findUnique as any)({
      where: { id: session.user.id },
      select: {
        persona: true,
        onboardingStep: true,
        onboardingCompleted: true,
      },
    });

    if (!user) return unauthorizedError();

    return NextResponse.json({
      success: true,
      data: {
        persona: (user as any).persona ?? null,
        onboardingStep: (user as any).onboardingStep ?? 0,
        onboardingCompleted: (user as any).onboardingCompleted ?? false,
      },
    });
  } catch (error) {
    logger.error('Error fetching persona', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch persona.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await req.json();
    const validation = validateBody(updatePersonaSchema, body);
    if (!validation.success) {
      return validationError('Invalid request', validation.errors);
    }

    const { persona, onboardingStep, onboardingCompleted } = validation.data;

    // Build update data only with provided fields
    const updateData: Record<string, unknown> = {};
    if (persona !== undefined) updateData.persona = persona;
    if (onboardingStep !== undefined) updateData.onboardingStep = onboardingStep;
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;

    if (Object.keys(updateData).length === 0) {
      return validationError('No fields to update');
    }

    // Use `as any` cast because persona/onboarding fields may not be
    // in the generated Prisma client yet (Windows EPERM on prisma generate)
    await (prisma.user.update as any)({
      where: { id: session.user.id },
      data: updateData,
    });

    logger.info('User persona/onboarding updated', {
      userId: session.user.id,
      ...updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Updated successfully.',
    });
  } catch (error) {
    logger.error('Error updating persona', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update persona.');
  }
}
