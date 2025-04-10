'use server';

import { getTools } from '~/lib/ai/aidba';
import { getConnection, listConnections } from '~/lib/db/connections';

export interface Tool {
  name: string;
  description: string;
  isBuiltIn: boolean;
  enabled: boolean;
}

export async function actionGetConnections(projectId: string) {
  try {
    return await listConnections(projectId);
  } catch (error) {
    console.error('Error getting connections:', error);
    return [];
  }
}

export async function actionGetBuiltInTools(connectionId: string): Promise<Tool[]> {
  try {
    const connection = await getConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const tools = await getTools(connection);

    console.log('tools', tools.parameters);
    return Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description || 'No description available',
      isBuiltIn: true,
      enabled: true
    }));
  } catch (error) {
    console.error('Error getting tools:', error);
    return [];
  }
}
