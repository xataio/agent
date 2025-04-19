'use server';

import { getDBClusterTools } from '~/lib/ai/tools/cluster';
import { commonToolset } from '~/lib/ai/tools/common';
import { getDBSQLTools } from '~/lib/ai/tools/db';
import { getPlaybookToolset } from '~/lib/ai/tools/playbook';
import { mergeToolsets } from '~/lib/ai/tools/types';
import { userMCPToolset } from '~/lib/ai/tools/user-mcp';
import { getConnection, listConnections } from '~/lib/db/connections';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getTargetDbPool } from '~/lib/targetdb/db';
import { requireUserSession } from '~/utils/route';

export interface Tool {
  name: string;
  description: string;
  isBuiltIn: boolean;
}

export async function actionGetConnections(projectId: string) {
  try {
    const dbAccess = await getUserSessionDBAccess();
    return await listConnections(dbAccess, projectId);
  } catch (error) {
    console.error('Error getting connections:', error);
    return [];
  }
}

export async function actionGetBuiltInTools(connectionId: string): Promise<Tool[]> {
  try {
    const userId = await requireUserSession();
    const dbAccess = await getUserSessionDBAccess();
    const connection = await getConnection(dbAccess, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Get SQL tools
    const targetDb = getTargetDbPool(connection.connectionString);
    const dbTools = getDBSQLTools(targetDb);

    // Get cluster tools
    const clusterTools = getDBClusterTools(dbAccess, connection, 'aws'); // Default to AWS for now

    // Get playbook tools
    const playbookToolset = getPlaybookToolset(dbAccess, connection.projectId);

    // Get MCP tools
    const mcpTools = await userMCPToolset.getTools(userId);

    // Merge all toolsets
    const mergedTools = mergeToolsets(commonToolset, playbookToolset, dbTools, clusterTools);

    const customTools = Object.entries(mcpTools).map(([name, tool]) => ({
      name,
      description: tool.description || 'No description available',
      isBuiltIn: false
    }));

    const builtInTools = Object.entries(mergedTools).map(([name, tool]) => ({
      name,
      description: tool.description || 'No description available',
      isBuiltIn: true
    }));

    // Convert to array format
    return [...customTools, ...builtInTools];
  } catch (error) {
    console.error('Error getting built-in tools:', error);
    return [];
  }
}
