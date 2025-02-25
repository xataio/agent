import { and, eq } from 'drizzle-orm';
import { PerformanceSetting, PgExtension, TableStat } from '../targetdb/db';
import { db } from './db';
import { dbinfo } from './schema';

type DbInfoModules =
  | {
      module: 'tables';
      data: TableStat[];
    }
  | {
      module: 'extensions';
      data: PgExtension[];
    }
  | {
      module: 'performance_settings';
      data: PerformanceSetting[];
    }
  | {
      module: 'vacuum_settings';
      data: PerformanceSetting[];
    };

type DbInfo = {
  connid: number;
} & DbInfoModules;

export async function saveDbInfo({ connid, module, data }: DbInfo) {
  await db
    .insert(dbinfo)
    .values({ connid, module, data })
    .onConflictDoUpdate({
      target: [dbinfo.connid, dbinfo.module],
      set: { data }
    })
    .execute();
}

export async function getDbInfo<Key extends DbInfoModules['module'], Value extends DbInfoModules & { module: Key }>(
  connid: number,
  key: Key
): Promise<Value['data'] | null> {
  const result = await db
    .select({ data: dbinfo.data })
    .from(dbinfo)
    .where(and(eq(dbinfo.connid, connid), eq(dbinfo.module, key)))
    .execute();

  return (result[0]?.data as Value['data']) ?? null;
}
