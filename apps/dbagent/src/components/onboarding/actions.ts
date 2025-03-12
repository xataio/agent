'use server';

import { getClusters } from '~/lib/db/aws-clusters';
import { getConnectionInfo } from '~/lib/db/connection-info';
import { getDefaultConnection } from '~/lib/db/connections';
import { getIntegration } from '~/lib/db/integrations';

// Server action to get completed tasks
export async function getCompletedTasks(projectId: string): Promise<string[]> {
  const completedTasks: string[] = [];
  const connection = await getDefaultConnection(projectId);
  if (!connection) {
    return [];
  }
  completedTasks.push('connect');

  const tables = await getConnectionInfo(connection.id, 'tables');
  if (tables) {
    completedTasks.push('collect');
  }

  const clusters = await getClusters(projectId);
  if (clusters.length > 0) {
    completedTasks.push('cloud');
  }

  const slack = await getIntegration(projectId, 'slack');
  if (slack) {
    completedTasks.push('notifications');
  }

  return completedTasks;
}

export async function getCompletedTaskPercentage(projectId: string): Promise<number> {
  const completedTasks = await getCompletedTasks(projectId);
  return Math.round((completedTasks.length / 4) * 100);
}
