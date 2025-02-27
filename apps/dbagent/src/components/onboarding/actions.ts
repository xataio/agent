'use server';

import { getClusters } from '~/lib/db/clusters';
import { getDefaultConnection } from '~/lib/db/connections';
import { getDbInfo } from '~/lib/db/dbinfo';
import { getIntegration } from '~/lib/db/integrations';

// Server action to get completed tasks
export async function getCompletedTasks(): Promise<string[]> {
  const completedTasks: string[] = [];
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

  const slack = await getIntegration('slack');
  if (slack) {
    completedTasks.push('notifications');
  }

  return completedTasks;
}

export async function getCompletedTaskPercentage(): Promise<number> {
  const completedTasks = await getCompletedTasks();
  return Math.round((completedTasks.length / 4) * 100);
}
