import { Tool } from 'ai';
import {
  builtinPlaybookToolset,
  commonToolset,
  DBSQLTools,
  getDBClusterTools,
  mergeToolsets,
  playbookTools,
  Toolset
} from '~/lib/ai/tools';
import { getConnectionByName, getDefaultConnection } from '~/lib/db/connections';
import { DBUserAccess } from '~/lib/db/db';
import { getProjectByName } from '~/lib/db/projects';
import { CloudProvider, Connection } from '~/lib/db/schema';
import { getTargetDbPool, Pool } from '~/lib/targetdb/db';

type PlaygroundToolsConfig = {
  projectConnection?: string;
  dbUrl?: string;
  userId?: string;
  cloudProvider?: CloudProvider;
};

export function buildPlaygroundTools(config: PlaygroundToolsConfig): Record<string, Tool> {
  const toolsets: Toolset[] = [commonToolset];
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
      const connGetter = createConnectionGetter(config.userId, projectName, connectionName);
      if (config.cloudProvider) {
        toolsets.push(getDBClusterTools(db, connGetter, config.cloudProvider));
      }

      const playbookToolset = new playbookTools(db, async () => {
        const conn = await connGetter();
        return { projectId: conn.projectId };
      });
      toolsets.push(playbookToolset);
      hasPlaybookToolset = true;

      if (!connString) {
        const targetDBPoolGetter = createTargetDBPoolGetter(connGetter);
        toolsets.push(new DBSQLTools(targetDBPoolGetter));
        hasDBTools = true;
      }
    }
  }

  if (connString && !hasDBTools) {
    toolsets.push(new DBSQLTools(getTargetDbPool(connString)));
  }
  if (!hasPlaybookToolset) {
    toolsets.push(builtinPlaybookToolset);
  }

  return mergeToolsets(...toolsets);
}

function createConnectionGetter(
  userId: string,
  projectName: string,
  connectionName?: string
): () => Promise<Connection> {
  let cachedConnection: Connection | null = null;
  return async () => {
    if (cachedConnection) {
      return cachedConnection;
    }

    const db = new DBUserAccess(userId);

    // First find the project by name where user has access
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

    cachedConnection = connection;
    return connection;
  };
}

function createTargetDBPoolGetter(connGetter: () => Promise<Connection>) {
  let cachedPool: Pool | null = null;
  return async () => {
    if (cachedPool) {
      return cachedPool;
    }
    const connection = await connGetter();
    cachedPool = getTargetDbPool(connection.connectionString);
    return cachedPool;
  };
}
