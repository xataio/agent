'use server';

import { getClusters } from '~/lib/db/aws-clusters';
import { getConnectionInfo } from '~/lib/db/connection-info';
import { getDefaultConnection } from '~/lib/db/connections';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getInstances } from '~/lib/db/gcp-instances';
import { getIntegration } from '~/lib/db/integrations';
import { getProjectById } from '~/lib/db/projects';

// Server action to get completed tasks
export async function getCompletedTasks(projectId: string): Promise<string[]> {
  const dbAccess = await getUserSessionDBAccess();

  const completedTasks: string[] = [];
  const connection = await getDefaultConnection(dbAccess, projectId);
  if (!connection) {
    return [];
  }
  completedTasks.push('connect');

  const tables = await getConnectionInfo(dbAccess, connection.id, 'tables');
  if (tables) {
    completedTasks.push('collect');
  }

  const project = await getProjectById(dbAccess, projectId);
  if (project?.cloudProvider === 'aws') {
    const clusters = await getClusters(dbAccess, projectId);
    if (clusters.length > 0) {
      completedTasks.push('cloud');
    }
  } else if (project?.cloudProvider === 'gcp') {
    const instances = await getInstances(dbAccess, projectId);
    if (instances.length > 0) {
      completedTasks.push('cloud');
    }
  }

  const slack = await getIntegration(dbAccess, projectId, 'slack');
  if (slack) {
    completedTasks.push('notifications');
  }

  return completedTasks;
}

export async function getCompletedTaskPercentage(projectId: string): Promise<number> {
  const completedTasks = await getCompletedTasks(projectId);
  return Math.round((completedTasks.length / 4) * 100);
}
