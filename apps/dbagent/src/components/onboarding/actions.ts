'use server';

import { getConnectionInfo } from '~/lib/db/connection-info';
import { getDefaultConnection } from '~/lib/db/connections';
import { getIntegration } from '~/lib/db/integrations';
import { getProjects } from '~/lib/db/projects';

// Server action to get completed tasks
export async function getCompletedTasks(): Promise<string[]> {
  const completedTasks: string[] = [];
  const connection = await getDefaultConnection();
  if (!connection) {
    return [];
  }
  completedTasks.push('connect');

  const tables = await getConnectionInfo(connection.id, 'tables');
  if (tables) {
    completedTasks.push('collect');
  }

  const clusters = await getProjects();
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
