import { and, eq } from 'drizzle-orm';
import { PerformanceSetting, PgExtension, TableStat } from '../targetdb/db';
import { db } from './db';
import { connectionInfo } from './schema';

type DbInfoTypes =
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

type DbInfo = {
  connectionId: string;
} & DbInfoTypes;

export async function saveDbInfo({ connectionId, type, data }: DbInfo) {
  await db
    .insert(connectionInfo)
    .values({ connectionId, type, data })
    .onConflictDoUpdate({
      target: [connectionInfo.connectionId, connectionInfo.type],
      set: { data }
    })
    .execute();
}

export async function getDbInfo<Key extends DbInfoTypes['type'], Value extends DbInfoTypes & { type: Key }>(
  connectionId: string,
  key: Key
): Promise<Value['data'] | null> {
  const result = await db
    .select({ data: connectionInfo.data })
    .from(connectionInfo)
    .where(and(eq(connectionInfo.connectionId, connectionId), eq(connectionInfo.type, key)))
    .execute();

  return (result[0]?.data as Value['data']) ?? null;
}
