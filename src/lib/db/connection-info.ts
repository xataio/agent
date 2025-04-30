'use server';

import { and, eq } from 'drizzle-orm';
import { PerformanceSetting, PgExtension, TableStat } from '../targetdb/db';
import { DBAccess } from './db';
import { connectionInfo, ConnectionInfoInsert } from './schema';

type ConnectionInfoDataTypes =
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

export async function saveConnectionInfo(
  dbAccess: DBAccess,
  { projectId, connectionId, type, data }: ConnectionInfoInsert & ConnectionInfoDataTypes
) {
  return dbAccess.query(async ({ db }) => {
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
  Key extends ConnectionInfoDataTypes['type'],
  Value extends ConnectionInfoDataTypes & { type: Key }
>(dbAccess: DBAccess, connectionId: string, key: Key): Promise<Value['data'] | null> {
  return dbAccess.query(async ({ db }) => {
    const result = await db
      .select({ data: connectionInfo.data })
      .from(connectionInfo)
      .where(and(eq(connectionInfo.connectionId, connectionId), eq(connectionInfo.type, key)))
      .execute();
    return (result[0]?.data as Value['data']) ?? null;
  });
}
