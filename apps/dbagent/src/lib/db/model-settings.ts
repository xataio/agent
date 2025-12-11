'use server';

import { and, eq } from 'drizzle-orm';
import { DBAccess } from './db';
import { ModelSetting, modelSettings } from './schema';

export async function getModelSettings(dbAccess: DBAccess, projectId: string): Promise<ModelSetting[]> {
  return dbAccess.query(async ({ db }) => {
    return await db.select().from(modelSettings).where(eq(modelSettings.projectId, projectId));
  });
}

export async function getModelSetting(
  dbAccess: DBAccess,
  projectId: string,
  modelId: string
): Promise<ModelSetting | null> {
  return dbAccess.query(async ({ db }) => {
    const result = await db
      .select()
      .from(modelSettings)
      .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.modelId, modelId)));
    return result[0] ?? null;
  });
}

export async function getDefaultModel(dbAccess: DBAccess, projectId: string): Promise<ModelSetting | null> {
  return dbAccess.query(async ({ db }) => {
    const result = await db
      .select()
      .from(modelSettings)
      .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.isDefault, true)));
    return result[0] ?? null;
  });
}

export async function getEnabledModelIds(dbAccess: DBAccess, projectId: string): Promise<string[]> {
  return dbAccess.query(async ({ db }) => {
    const settings = await db
      .select({ modelId: modelSettings.modelId })
      .from(modelSettings)
      .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.enabled, true)));
    return settings.map((s) => s.modelId);
  });
}

export async function getDisabledModelIds(dbAccess: DBAccess, projectId: string): Promise<string[]> {
  return dbAccess.query(async ({ db }) => {
    const settings = await db
      .select({ modelId: modelSettings.modelId })
      .from(modelSettings)
      .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.enabled, false)));
    return settings.map((s) => s.modelId);
  });
}

export async function updateModelEnabled(
  dbAccess: DBAccess,
  projectId: string,
  modelId: string,
  enabled: boolean
): Promise<ModelSetting> {
  return dbAccess.query(async ({ db }) => {
    const existing = await db
      .select()
      .from(modelSettings)
      .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.modelId, modelId)));

    if (existing[0]) {
      const result = await db
        .update(modelSettings)
        .set({ enabled, updatedAt: new Date() })
        .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.modelId, modelId)))
        .returning();
      return result[0]!;
    } else {
      const result = await db
        .insert(modelSettings)
        .values({
          projectId,
          modelId,
          enabled,
          isDefault: false
        })
        .returning();
      return result[0]!;
    }
  });
}

export async function setDefaultModel(dbAccess: DBAccess, projectId: string, modelId: string): Promise<ModelSetting> {
  return dbAccess.query(async ({ db }) => {
    return await db.transaction(async (trx) => {
      // Clear existing default
      await trx
        .update(modelSettings)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.isDefault, true)));

      // Check if setting exists for this model
      const existing = await trx
        .select()
        .from(modelSettings)
        .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.modelId, modelId)));

      if (existing[0]) {
        // Update existing to be default and ensure it's enabled
        const result = await trx
          .update(modelSettings)
          .set({ isDefault: true, enabled: true, updatedAt: new Date() })
          .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.modelId, modelId)))
          .returning();
        return result[0]!;
      } else {
        // Create new setting as default
        const result = await trx
          .insert(modelSettings)
          .values({
            projectId,
            modelId,
            enabled: true,
            isDefault: true
          })
          .returning();
        return result[0]!;
      }
    });
  });
}

export async function deleteModelSetting(dbAccess: DBAccess, projectId: string, modelId: string): Promise<void> {
  return dbAccess.query(async ({ db }) => {
    await db
      .delete(modelSettings)
      .where(and(eq(modelSettings.projectId, projectId), eq(modelSettings.modelId, modelId)));
  });
}
