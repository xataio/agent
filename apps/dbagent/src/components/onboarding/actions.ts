'use server';

import { getClusters } from '~/lib/db/clusters';
import { getDefaultConnection } from '~/lib/db/connections';
import { getDbInfo } from '~/lib/db/dbinfo';

// Server action to get completed tasks
export async function getCompletedTasks(): Promise<string[]> {
  const completedTasks: string[] = [];
  // TODO: Implement getting completed tasks from database
  const connection = await getDefaultConnection();
  if (!connection) {
    return [];
  }
  completedTasks.push('connect');

  const tables = await getDbInfo(connection.id, 'tables');
  if (tables) {
    completedTasks.push('collect');
  }

  const clusters = await getClusters();
  if (clusters.length > 0) {
    completedTasks.push('cloud');
  }

  return completedTasks;
}
