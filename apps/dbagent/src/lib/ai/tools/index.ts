import { Tool } from 'ai';
import { Pool } from 'pg';
import { getUserDBAccess } from '~/lib/db/db';
import { Connection, Project } from '~/lib/db/schema';
import { getDBClusterTools } from './cluster';
import { commonToolset } from './common';
import { getDBSQLTools } from './db';
import { getPlaybookToolset } from './playbook';
import { mergeToolsets } from './types';

export * from './cluster';
export * from './common';
export * from './db';
export * from './playbook';
export * from './types';

export async function getTools({
  project,
  connection,
  targetDb,
  userId
}: {
  project: Project;
  connection: Connection;
  targetDb: Pool;
  userId: string;
}): Promise<Record<string, Tool>> {
  const dbAccess = await getUserDBAccess(userId);

  const dbTools = getDBSQLTools(targetDb);
  const clusterTools = getDBClusterTools(dbAccess, connection, project.cloudProvider);
  const playbookToolset = getPlaybookToolset(dbAccess, project.id);
  return mergeToolsets(commonToolset, playbookToolset, dbTools, clusterTools);
}
