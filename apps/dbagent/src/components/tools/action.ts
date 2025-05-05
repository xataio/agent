'use server';

import { getDBClusterTools } from '~/lib/ai/tools/cluster';
import { commonToolset } from '~/lib/ai/tools/common';
import { getDBSQLTools } from '~/lib/ai/tools/db';
import { getPlaybookToolset } from '~/lib/ai/tools/playbook';
import { mergeToolsets } from '~/lib/ai/tools/types';
import { mcpToolset } from '~/lib/ai/tools/user-mcp';
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

export async function actionGetBuiltInAndCustomTools(connectionId: string): Promise<Tool[]> {
  try {
    const [builtInTools, customTools] = await Promise.all([
      actionGetBuiltInTools(connectionId),
      actionGetCustomTools(connectionId)
    ]);
    return [...customTools, ...builtInTools];
  } catch (error) {
    console.error('Error getting tools:', error);
    return [];
  }
}

export async function actionGetBuiltInTools(connectionId: string): Promise<Tool[]> {
  try {
    await requireUserSession();
    const dbAccess = await getUserSessionDBAccess();
    const connection = await getConnection(dbAccess, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const targetDb = getTargetDbPool(connection.connectionString);
    const dbTools = getDBSQLTools(targetDb);

    const clusterTools = getDBClusterTools(dbAccess, connection, 'aws'); // Default to AWS for now
    const playbookToolset = getPlaybookToolset(dbAccess, connection.projectId);
    const mergedTools = mergeToolsets(commonToolset, playbookToolset, dbTools, clusterTools);

    return Object.entries(mergedTools).map(([name, tool]) => ({
      name,
      description: tool.description || 'No description available',
      isBuiltIn: true
    }));
  } catch (error) {
    console.error('Error getting built-in tools:', error);
    return [];
  }
}

export async function actionGetCustomTools(connectionId: string): Promise<Tool[]> {
  try {
    const dbAccess = await getUserSessionDBAccess();
    const connection = await getConnection(dbAccess, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const mcpTools = await mcpToolset.listMCPTools();
    return Object.entries(mcpTools).map(([name, tool]) => ({
      name,
      description: tool.description || 'No description available',
      isBuiltIn: false
    }));
  } catch (error) {
    console.error('Error getting custom tools:', error);
    return [];
  }
}

export async function actionGetCustomToolsFromMCPServer(serverFileName: string): Promise<Tool[]> {
  try {
    const mcpTools = await mcpToolset.getMCPToolForServer(serverFileName);
    return Object.entries(mcpTools).map(([name, tool]) => ({
      name,
      description: tool.description || 'No description available',
      isBuiltIn: false
    }));
  } catch (error) {
    console.error('Error getting custom tools from MCP server:', error);
    return [];
  }
}
