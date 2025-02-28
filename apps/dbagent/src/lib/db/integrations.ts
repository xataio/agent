import { eq } from 'drizzle-orm';
import { db } from './db';
import { projectIntegrations } from './schema';

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
  await db
    .insert(projectIntegrations)
    .values({
      projectId,
      name: name,
      data: data
    })
    .onConflictDoUpdate({
      target: projectIntegrations.name,
      set: {
        data: data
      }
    });
}

export async function getIntegration<
  Key extends IntegrationTypes['type'],
  Value extends IntegrationTypes & { type: Key }
>(name: Key): Promise<Value['data'] | null> {
  const result = await db.select().from(projectIntegrations).where(eq(projectIntegrations.name, name));
  return (result[0]?.data as Value['data']) || null;
}
