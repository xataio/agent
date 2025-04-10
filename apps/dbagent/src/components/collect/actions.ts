'use server';

import { getConnectionInfo, saveConnectionInfo } from '~/lib/db/connection-info';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { Connection } from '~/lib/db/schema';
import {
  getExtensions,
  getPerformanceSettings,
  getTableStats,
  getVacuumSettings,
  PerformanceSetting,
  PgExtension,
  TableStat,
  withTargetDbConnection
} from '~/lib/targetdb/db';

export async function collectInfo(connection: Connection | undefined) {
  if (!connection) {
    return { success: false, message: 'No connection selected' };
  }
  return await withTargetDbConnection(connection.connectionString, async (client) => {
    try {
      const result = await client.query('SELECT * FROM public.test');
      return { success: true, message: 'Info collected successfully', data: result.rows };
    } catch (error) {
      return { success: false, message: `Error collecting info: ${error}` };
    }
  });
}

export async function collectTables(
  connection: Connection | undefined
): Promise<{ success: boolean; message?: string; data: TableStat[] }> {
  if (!connection) {
    return { success: false, message: 'No connection selected', data: [] };
  }
  let data: TableStat[] = [];
  try {
    data = await withTargetDbConnection(connection.connectionString, getTableStats);
  } catch (error) {
    return { success: false, message: `Error collecting tables: ${error}`, data: [] };
  }
  const dbAccess = await getUserSessionDBAccess();
  try {
    await saveConnectionInfo(dbAccess, {
      projectId: connection.projectId,
      connectionId: connection.id,
      type: 'tables',
      data
    });
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
  connection: Connection | undefined
): Promise<{ success: boolean; message?: string; data: PgExtension[] }> {
  if (!connection) {
    return { success: false, message: 'No connection selected', data: [] };
  }
  let data: PgExtension[] = [];
  try {
    data = await withTargetDbConnection(connection.connectionString, getExtensions);
  } catch (error) {
    return { success: false, message: `Error collecting extensions: ${error}`, data: [] };
  }
  const dbAccess = await getUserSessionDBAccess();
  try {
    await saveConnectionInfo(dbAccess, {
      projectId: connection.projectId,
      connectionId: connection.id,
      type: 'extensions',
      data
    });
  } catch (error) {
    return { success: false, message: `Error saving extensions: ${error}`, data: [] };
  }
  return { success: true, message: 'Extensions collected successfully', data: data };
}

export async function collectPerformanceSettings(
  connection: Connection | undefined
): Promise<{ success: boolean; message?: string; data: PerformanceSetting[] }> {
  if (!connection) {
    return { success: false, message: 'No connection selected', data: [] };
  }
  let data: PerformanceSetting[] = [];
  try {
    data = await withTargetDbConnection(connection.connectionString, getPerformanceSettings);
  } catch (error) {
    return { success: false, message: `Error collecting performance settings: ${error}`, data: [] };
  }
  const dbAccess = await getUserSessionDBAccess();
  try {
    await saveConnectionInfo(dbAccess, {
      projectId: connection.projectId,
      connectionId: connection.id,
      type: 'performance_settings',
      data
    });
  } catch (error) {
    return { success: false, message: `Error saving performance settings: ${error}`, data: [] };
  }
  return { success: true, message: 'Performance settings collected successfully', data: data };
}

export async function collectVacuumData(
  connection: Connection | undefined
): Promise<{ success: boolean; message?: string; data: PerformanceSetting[] }> {
  if (!connection) {
    return { success: false, message: 'No connection selected', data: [] };
  }
  let data: PerformanceSetting[] = [];
  try {
    data = await withTargetDbConnection(connection.connectionString, getVacuumSettings);
  } catch (error) {
    return { success: false, message: `Error collecting vacuum data: ${error}`, data: [] };
  }
  const dbAccess = await getUserSessionDBAccess();
  try {
    await saveConnectionInfo(dbAccess, {
      projectId: connection.projectId,
      connectionId: connection.id,
      type: 'vacuum_settings',
      data
    });
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
  connection: Connection | undefined
): Promise<{ success: boolean; message?: string; data: CollectInfo | null }> {
  if (!connection) {
    return { success: false, message: 'No connection selected', data: null };
  }

  const dbAccess = await getUserSessionDBAccess();
  try {
    const tables = await getConnectionInfo(dbAccess, connection.id, 'tables');
    const extensions = await getConnectionInfo(dbAccess, connection.id, 'extensions');
    const performance_settings = await getConnectionInfo(dbAccess, connection.id, 'performance_settings');
    const vacuum_settings = await getConnectionInfo(dbAccess, connection.id, 'vacuum_settings');
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
