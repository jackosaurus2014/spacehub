import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateModulePreference, getUserModulePreferences } from '@/lib/module-preferences';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { moduleId } = params;
    const body = await req.json();
    const { enabled, position, settings } = body;

    await updateModulePreference(session.user.id, moduleId, {
      enabled,
      position,
      settings,
    });

    const modules = await getUserModulePreferences(session.user.id);
    return NextResponse.json({ modules });
  } catch (error) {
    logger.error('Error updating module', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to update module' },
      { status: 500 }
    );
  }
}
