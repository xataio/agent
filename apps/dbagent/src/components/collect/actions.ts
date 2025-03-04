'use server';

import { DbConnection } from '~/lib/db/connections';
import { getDbInfo, saveDbInfo } from '~/lib/db/dbinfo';
import {
  getExtensions,
  getPerformanceSettings,
  getTableStats,
  getTargetDbConnection,
  getVacuumSettings,
  PerformanceSetting,
  PgExtension,
  TableStat
} from '~/lib/targetdb/db';

export async function collectInfo(conn: DbConnection | undefined) {
  if (!conn) {
    return { success: false, message: 'No connection selected' };
  }
  const client = await getTargetDbConnection(conn.connectionString);
  try {
    const result = await client.query('SELECT * FROM public.test');
    return { success: true, message: 'Info collected successfully', data: result.rows };
  } catch (error) {
    return { success: false, message: `Error collecting info: ${error}` };
  } finally {
    await client.end();
  }
}

export async function collectTables(
  conn: DbConnection | undefined
): Promise<{ success: boolean; message?: string; data: TableStat[] }> {
  if (!conn) {
    return { success: false, message: 'No connection selected', data: [] };
  }
  let data: TableStat[] = [];
  try {
    data = await getTableStats(conn.connectionString);
  } catch (error) {
    return { success: false, message: `Error collecting tables: ${error}`, data: [] };
  }
  try {
    await saveDbInfo({ connectionId: conn.id, type: 'tables', data });
  } catch (error) {
    return { success: false, message: `Error saving tables: ${error}`, data: [] };
  }
  return {
    success: true,
    message: 'Tables collected successfully',
    data: data
  };
}

export async function collectExtensions(
  conn: DbConnection | undefined
): Promise<{ success: boolean; message?: string; data: PgExtension[] }> {
  if (!conn) {
    return { success: false, message: 'No connection selected', data: [] };
  }
  let data: PgExtension[] = [];
  try {
    data = await getExtensions(conn.connectionString);
  } catch (error) {
    return { success: false, message: `Error collecting extensions: ${error}`, data: [] };
  }
  try {
    await saveDbInfo({ connectionId: conn.id, type: 'extensions', data });
  } catch (error) {
    return { success: false, message: `Error saving extensions: ${error}`, data: [] };
  }
  return { success: true, message: 'Extensions collected successfully', data: data };
}

export async function collectPerformanceSettings(
  conn: DbConnection | undefined
): Promise<{ success: boolean; message?: string; data: PerformanceSetting[] }> {
  if (!conn) {
    return { success: false, message: 'No connection selected', data: [] };
  }
  let data: PerformanceSetting[] = [];
  try {
    data = await getPerformanceSettings(conn.connectionString);
  } catch (error) {
    return { success: false, message: `Error collecting performance settings: ${error}`, data: [] };
  }
  try {
    await saveDbInfo({ connectionId: conn.id, type: 'performance_settings', data });
  } catch (error) {
    return { success: false, message: `Error saving performance settings: ${error}`, data: [] };
  }
  return { success: true, message: 'Performance settings collected successfully', data: data };
}

export async function collectVacuumData(
  connection: DbConnection | undefined
): Promise<{ success: boolean; message?: string; data: PerformanceSetting[] }> {
  if (!connection) {
    return { success: false, message: 'No connection selected', data: [] };
  }
  let data: PerformanceSetting[] = [];
  try {
    data = await getVacuumSettings(connection.connectionString);
  } catch (error) {
    return { success: false, message: `Error collecting vacuum data: ${error}`, data: [] };
  }
  try {
    await saveDbInfo({ connectionId: connection.id, type: 'vacuum_settings', data });
  } catch (error) {
    return { success: false, message: `Error saving vacuum data: ${error}`, data: [] };
  }
  return { success: true, message: 'Vacuum data collected successfully', data: data };
}

export interface CollectInfo {
  tables: TableStat[];
  extensions: PgExtension[];
  performance_settings: PerformanceSetting[];
  vacuum_settings: PerformanceSetting[];
}

export async function getCollectInfo(
  conn: DbConnection | undefined
): Promise<{ success: boolean; message?: string; data: CollectInfo | null }> {
  if (!conn) {
    return { success: false, message: 'No connection selected', data: null };
  }
  try {
    const tables = await getDbInfo(conn.id, 'tables');
    const extensions = await getDbInfo(conn.id, 'extensions');
    const performance_settings = await getDbInfo(conn.id, 'performance_settings');
    const vacuum_settings = await getDbInfo(conn.id, 'vacuum_settings');
    if (!tables || !extensions || !performance_settings || !vacuum_settings) {
      return { success: true, message: 'No data found', data: null };
    }
    return {
      success: true,
      message: 'Info collected successfully',
      data: {
        tables,
        extensions,
        performance_settings,
        vacuum_settings
      }
    };
  } catch (error) {
    return { success: false, message: `Error collecting info: ${error}`, data: null };
  }
}
