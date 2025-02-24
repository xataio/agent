import { PerformanceSetting, PgExtension, TableStat } from '../targetdb/db';
import { prisma } from './db';

export async function saveDbInfo(connid: number, module: string, data: string) {
  await prisma.dbinfo.upsert({
    where: {
      connid_module: {
        connid,
        module
      }
    },
    update: {
      data
    },
    create: {
      connid,
      module,
      data
    }
  });
}

type DbInfoModules = {
  tables: TableStat[];
  extensions: PgExtension[];
  performance_settings: PerformanceSetting[];
  vacuum_settings: PerformanceSetting[];
};

export async function getDbInfo<T extends keyof DbInfoModules>(
  connid: number,
  module: T
): Promise<DbInfoModules[T] | null> {
  const result = await prisma.dbinfo.findUnique({
    where: {
      connid_module: {
        connid,
        module
      }
    },
    select: {
      data: true
    }
  });
  return result?.data || null;
}
