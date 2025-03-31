import { Tool } from 'ai';
import { commonToolset, DBClusterTools, DBSQLTools, mergeToolsets, playbookToolset, Toolset } from '~/lib/ai/tools';
import { Connection, getConnectionByName, getDefaultConnection } from '~/lib/db/connections';
import { DBUserAccess } from '~/lib/db/db';
import { getProjectByName } from '~/lib/db/projects';
import { getTargetDbPool, Pool } from '~/lib/targetdb/db';

type PlaygroundToolsConfig = {
  projectConnection?: string;
  dbUrl?: string;
  userId?: string;
};

export function buildPlaygroundTools(config: PlaygroundToolsConfig): Record<string, Tool> {
  const toolsets: Toolset[] = [commonToolset, playbookToolset];
  const connString: string | null = config.dbUrl ?? null;

  // Set up user ID provider if configured
  if (config.userId) {
    /// XXX: The use of 'Connection' currently breaks the playground due to next dependency issues.
    if (config.projectConnection && config.projectConnection !== '') {
      const [projectName, connectionName] = config.projectConnection.split('/');
      if (!projectName || !connectionName) {
        throw new Error('MASTRA_PROJECT_CONNECTION must be in format "projectName/connectionName"');
      }

      const db = new DBUserAccess(config.userId);
      const connGetter = createConnectionGetter(config.userId, projectName, connectionName);
      toolsets.push(new DBClusterTools(db, async () => await connGetter()));

      if (!connString) {
        const targetDBPoolGetter = createTargetDBPoolGetter(connGetter);
        toolsets.push(new DBSQLTools(targetDBPoolGetter));
      }
    }
  } else if (connString) {
    toolsets.push(new DBSQLTools(getTargetDbPool(connString)));
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
