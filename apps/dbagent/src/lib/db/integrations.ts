'use server';

import { and, eq } from 'drizzle-orm';
import { queryDb } from './db';
import { integrations } from './schema';

export type AwsIntegration = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
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
    };

export async function saveIntegration<
  Key extends IntegrationTypes['type'],
  Value extends IntegrationTypes & { type: Key }
>(projectId: string, name: Key, data: Value['data']) {
  return queryDb(async ({ db }) => {
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
>(projectId: string, name: Key, asUserId?: string): Promise<Value['data'] | null> {
  return queryDb(
    async ({ db }) => {
      const result = await db
        .select()
        .from(integrations)
        .where(and(eq(integrations.projectId, projectId), eq(integrations.name, name)));

      return (result[0]?.data as Value['data']) || null;
    },
    {
      asUserId: asUserId
    }
  );
}
