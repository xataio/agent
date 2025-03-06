import { and, eq } from 'drizzle-orm';
import { PerformanceSetting, PgExtension, TableStat } from '../targetdb/db';
import { queryDb } from './db';
import { connectionInfo } from './schema';

type ConnectionInfoTypes =
  | {
      type: 'tables';
      data: TableStat[];
    }
  | {
      type: 'extensions';
      data: PgExtension[];
    }
  | {
      type: 'performance_settings';
      data: PerformanceSetting[];
    }
  | {
      type: 'vacuum_settings';
      data: PerformanceSetting[];
    };

type ConnectionInfo = {
  projectId: string;
  connectionId: string;
} & ConnectionInfoTypes;

export async function saveConnectionInfo({ projectId, connectionId, type, data }: ConnectionInfo) {
  return queryDb(async ({ db }) => {
    await db
      .insert(connectionInfo)
      .values({ projectId, connectionId, type, data })
      .onConflictDoUpdate({
        target: [connectionInfo.connectionId, connectionInfo.type],
        set: { data }
      })
      .execute();
  });
}

export async function getConnectionInfo<
  Key extends ConnectionInfoTypes['type'],
  Value extends ConnectionInfoTypes & { type: Key }
>(connectionId: string, key: Key): Promise<Value['data'] | null> {
  return queryDb(async ({ db }) => {
    const result = await db
      .select({ data: connectionInfo.data })
      .from(connectionInfo)
      .where(and(eq(connectionInfo.connectionId, connectionId), eq(connectionInfo.type, key)))
      .execute();
    return (result[0]?.data as Value['data']) ?? null;
  });
}
