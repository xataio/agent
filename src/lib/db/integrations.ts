'use server';

import { and, eq } from 'drizzle-orm';
import { DBAccess } from './db';
import { integrations } from './schema';

export type AwsIntegration = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export type GcpIntegration = {
  clientEmail: string;
  privateKey: string;
  gcpProjectId: string;
};

export type SlackIntegration = {
  webhookUrl: string;
};

type IntegrationTypes =
  | {
      type: 'aws';
      data: AwsIntegration;
    }
  | {
      type: 'slack';
      data: SlackIntegration;
    }
  | {
      type: 'gcp';
      data: GcpIntegration;
    };

export async function saveIntegration<
  Key extends IntegrationTypes['type'],
  Value extends IntegrationTypes & { type: Key }
>(dbAccess: DBAccess, projectId: string, name: Key, data: Value['data']) {
  return dbAccess.query(async ({ db }) => {
    await db
      .insert(integrations)
      .values({
        projectId,
        name: name,
        data: data
      })
      .onConflictDoUpdate({
        target: [integrations.projectId, integrations.name],
        set: {
          data: data
        }
      });
  });
}

export async function getIntegration<
  Key extends IntegrationTypes['type'],
  Value extends IntegrationTypes & { type: Key }
>(dbAccess: DBAccess, projectId: string, name: Key): Promise<Value['data'] | null> {
  return dbAccess.query(async ({ db }) => {
    const result = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.projectId, projectId), eq(integrations.name, name)));

    return (result[0]?.data as Value['data']) || null;
  });
}
