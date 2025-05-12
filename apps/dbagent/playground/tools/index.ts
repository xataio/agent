import { Tool } from 'ai';
import {
  builtinPlaybookToolset,
  commonToolset,
  getDBClusterTools,
  getDBSQLTools,
  getPlaybookToolset,
  getProjectClusterService,
  projectPlaybookService,
  targetDBService
} from '~/lib/ai/tools';
import { getConnectionByName, getDefaultConnection } from '~/lib/db/connections';
import { DBUserAccess } from '~/lib/db/db';
import { getProjectByName } from '~/lib/db/projects';
import { CloudProvider, Connection } from '~/lib/db/schema';
import { getTargetDbPool } from '~/lib/targetdb/db';

type PlaygroundToolsConfig = {
  projectConnection?: string;
  dbUrl?: string;
  userId?: string;
  cloudProvider?: CloudProvider;
};

export async function buildPlaygroundTools(config: PlaygroundToolsConfig): Promise<Record<string, Tool>> {
  const toolsets: Record<string, Tool>[] = [commonToolset];
  const connString: string | null = config.dbUrl ?? null;

  // Set up user ID provider if configured
  let hasPlaybookToolset = false;
  let hasDBTools = false;
  if (config.userId) {
    /// XXX: The use of 'Connection' currently breaks the playground due to next dependency issues.
    if (config.projectConnection && config.projectConnection !== '') {
      const [projectName, connectionName] = config.projectConnection.split('/');
      if (!projectName || !connectionName) {
        throw new Error('MASTRA_PROJECT_CONNECTION must be in format "projectName/connectionName"');
      }

      const db = new DBUserAccess(config.userId);
      const conn = await getConnection(config.userId, projectName, connectionName);
      if (config.cloudProvider) {
        const clusterService = getProjectClusterService(db, conn, config.cloudProvider);
        toolsets.push(getDBClusterTools(clusterService));
      }

      const playbookToolset = getPlaybookToolset(projectPlaybookService(db, conn.projectId));
      toolsets.push(playbookToolset);
      hasPlaybookToolset = true;

      if (!connString) {
        const targetDBPool = getTargetDbPool(conn.connectionString);
        toolsets.push(getDBSQLTools({ db: targetDBService(targetDBPool) }));
        hasDBTools = true;
      }
    }
  }

  if (connString && !hasDBTools) {
    toolsets.push(getDBSQLTools({ db: targetDBService(getTargetDbPool(connString)) }));
  }
  if (!hasPlaybookToolset) {
    toolsets.push(builtinPlaybookToolset);
  }

  return toolsets.reduce((acc, toolset) => {
    return {
      ...acc,
      ...toolset
    };
  }, {});
}

export async function getConnection(userId: string, projectName: string, connectionName?: string): Promise<Connection> {
  const db = new DBUserAccess(userId);
  const project = await getProjectByName(db, projectName);
  if (!project) {
    throw new Error(`Project "${projectName}" not found or access denied`);
  }

  const connection = connectionName
    ? await getConnectionByName(db, project.id, connectionName)
    : await getDefaultConnection(db, project.id);
  if (!connection) {
    throw new Error(
      connectionName
        ? `Connection "${connectionName}" not found in project "${projectName}"`
        : `No default connection found in project "${projectName}"`
    );
  }

  return connection;
}
