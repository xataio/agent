import { PerformanceSetting, PgExtension, TableStat } from '../targetdb/db';
import { pool } from './db';

export async function saveDbInfo(connid: number, module: string, data: string) {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO dbinfo(connid, module, data) VALUES($1, $2, $3) ON CONFLICT (connid, module) DO UPDATE SET data = $3',
      [connid, module, data]
    );
  } finally {
    client.release();
  }
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
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT data FROM dbinfo WHERE connid = $1 AND module = $2', [connid, module]);
    return result.rows[0]?.data || null;
  } finally {
    client.release();
  }
}
