import { getConnectionInfo } from '../db/connection-info';
import { Connection } from '../db/connections';
import { getProjectById } from '../db/projects';
import { ClientBase, findTableSchema, getPerformanceSettings, getVacuumSettings } from '../targetdb/db';

export async function getTablesAndInstanceInfo(connection: Connection, asUserId?: string): Promise<string> {
  try {
    const tables = await getConnectionInfo(connection.id, 'tables', asUserId);
    const project = await getProjectById(connection.projectId, asUserId);

    return `
Here are the tables, their sizes, and usage counts:

${JSON.stringify(tables)}

Here is information about the Project:

${JSON.stringify(project)}
`;
  } catch (error) {
    console.error('Error getting tables and instance info', error);
    return 'Error getting tables and instance info';
  }
}

export async function getPerformanceAndVacuumSettings(client: ClientBase): Promise<string> {
  const performanceSettings = await getPerformanceSettings(client);
  const vacuumSettings = await getVacuumSettings(client);

  return `
Performance settings: ${JSON.stringify(performanceSettings)}
Vacuum settings: ${JSON.stringify(vacuumSettings)}
`;
}

export async function getPostgresExtensions(connection: Connection, asUserId?: string): Promise<string> {
  const extensions = await getConnectionInfo(connection.id, 'extensions', asUserId);
  return `Extensions: ${JSON.stringify(extensions)}`;
}

export async function toolFindTableSchema(client: ClientBase, tableName: string): Promise<string> {
  try {
    const result = await findTableSchema(client, tableName);
    return result;
  } catch (error) {
    console.error('Error finding schema for table', error);
    return 'public'; // Default to public on error
  }
}
