import { getClusterByConnection } from '../db/clusters';

import { DbConnection } from '../db/connections';
import { getDbInfo } from '../db/dbinfo';
import { getPerformanceSettings, getVacuumSettings } from '../targetdb/db';

export async function getTablesAndInstanceInfo(connection: DbConnection): Promise<string> {
  try {
    const tables = await getDbInfo(connection.id, 'tables');
    const cluster = await getClusterByConnection(connection.id);

    return `
Here are the tables, their sizes, and usage counts:

${JSON.stringify(tables)}

Here is information about the AWS RDS cluster:

${JSON.stringify(cluster)}
`;
  } catch (error) {
    console.error('Error getting tables and instance info', error);
    return 'Error getting tables and instance info';
  }
}

export async function getPerformanceAndVacuumSettings(connection: DbConnection): Promise<string> {
  const performanceSettings = await getPerformanceSettings(connection.connectionString);
  const vacuumSettings = await getVacuumSettings(connection.connectionString);

  return `
Performance settings: ${JSON.stringify(performanceSettings)}
Vacuum settings: ${JSON.stringify(vacuumSettings)}
`;
}

export async function getPostgresExtensions(connection: DbConnection): Promise<string> {
  const extensions = await getDbInfo(connection.id, 'extensions');
  return `Extensions: ${JSON.stringify(extensions)}`;
}

export async function findTableSchema(client: any, tableName: string): Promise<string> {
  const query = `
    SELECT 
      schemaname as schema,
      pg_total_relation_size(schemaname || '.' || tablename) as total_bytes
    FROM pg_tables 
    WHERE tablename = $1
    ORDER BY total_bytes DESC
    LIMIT 1;
  `;

  try {
    const result = await client.query(query, [tableName]);
    if (result.rows.length === 0) {
      return 'public'; // Default to public if no match found
    }
    return result.rows[0].schema;
  } catch (error) {
    console.error('Error finding schema for table', error);
    return 'public'; // Default to public on error
  }
}
