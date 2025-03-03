import { and, eq } from 'drizzle-orm';
import { PerformanceSetting, PgExtension, TableStat } from '../targetdb/db';
import { db } from './db';
import { connectionsInfo } from './schema';

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
  connectionId: string;
} & ConnectionInfoTypes;

export async function saveDbInfo({ connectionId, type, data }: ConnectionInfo) {
  await db
    .insert(connectionsInfo)
    .values({ connectionId, type, data })
    .onConflictDoUpdate({
      target: [connectionsInfo.connectionId, connectionsInfo.type],
      set: { data }
    })
    .execute();
}

export async function getDbInfo<
  Key extends ConnectionInfoTypes['type'],
  Value extends ConnectionInfoTypes & { type: Key }
>(connectionId: string, key: Key): Promise<Value['data'] | null> {
  const result = await db
    .select({ data: connectionsInfo.data })
    .from(connectionsInfo)
    .where(and(eq(connectionsInfo.connectionId, connectionId), eq(connectionsInfo.type, key)))
    .execute();

  return (result[0]?.data as Value['data']) ?? null;
}
