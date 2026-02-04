import prisma from './db';
import { AVAILABLE_MODULES, ModuleConfig, ModuleSection } from '@/types';

export interface UserModuleWithConfig {
  moduleId: string;
  name: string;
  description: string;
  icon: string;
  section: ModuleSection;
  enabled: boolean;
  position: number;
  settings: Record<string, unknown> | null;
}

export async function getUserModulePreferences(userId: string): Promise<UserModuleWithConfig[]> {
  const preferences = await prisma.userModulePreference.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
  });

  // Create a map of user preferences
  const prefMap = new Map(preferences.map(p => [p.moduleId, p]));

  // Merge with available modules
  const modules: UserModuleWithConfig[] = AVAILABLE_MODULES.map((module) => {
    const userPref = prefMap.get(module.moduleId);

    return {
      moduleId: module.moduleId,
      name: module.name,
      description: module.description,
      icon: module.icon,
      section: module.section,
      enabled: userPref?.enabled ?? module.defaultEnabled,
      position: userPref?.position ?? module.defaultPosition,
      settings: userPref?.settings ? JSON.parse(userPref.settings) : null,
    };
  });

  // Sort by position
  return modules.sort((a, b) => a.position - b.position);
}

export async function getDefaultModulePreferences(): Promise<UserModuleWithConfig[]> {
  return AVAILABLE_MODULES
    .map((module) => ({
      moduleId: module.moduleId,
      name: module.name,
      description: module.description,
      icon: module.icon,
      section: module.section,
      enabled: module.defaultEnabled,
      position: module.defaultPosition,
      settings: null,
    }))
    .sort((a, b) => a.position - b.position);
}

export async function updateModulePreference(
  userId: string,
  moduleId: string,
  updates: {
    enabled?: boolean;
    position?: number;
    settings?: Record<string, unknown>;
  }
) {
  const module = AVAILABLE_MODULES.find(m => m.moduleId === moduleId);
  if (!module) {
    throw new Error(`Module ${moduleId} not found`);
  }

  return prisma.userModulePreference.upsert({
    where: {
      userId_moduleId: { userId, moduleId },
    },
    update: {
      enabled: updates.enabled,
      position: updates.position,
      settings: updates.settings ? JSON.stringify(updates.settings) : undefined,
    },
    create: {
      userId,
      moduleId,
      enabled: updates.enabled ?? module.defaultEnabled,
      position: updates.position ?? module.defaultPosition,
      settings: updates.settings ? JSON.stringify(updates.settings) : null,
    },
  });
}

export async function reorderModules(
  userId: string,
  moduleOrder: string[]
) {
  const updates = moduleOrder.map((moduleId, index) =>
    prisma.userModulePreference.upsert({
      where: {
        userId_moduleId: { userId, moduleId },
      },
      update: {
        position: index,
      },
      create: {
        userId,
        moduleId,
        position: index,
        enabled: true,
      },
    })
  );

  await prisma.$transaction(updates);
}

export async function toggleModule(
  userId: string,
  moduleId: string,
  enabled: boolean
) {
  return updateModulePreference(userId, moduleId, { enabled });
}
