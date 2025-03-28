import { Tool } from 'ai';
import { commonToolset, DBClusterTools, DBSQLTools, mergeToolsets, playbookToolset, Toolset } from '~/lib/ai/tools';
import { Connection, getConnectionByName, getDefaultConnection } from '~/lib/db/connections';
import { setUserIdProvider } from '~/lib/db/db';
import { getProjectByName } from '~/lib/db/projects';
import { getTargetDbPool, Pool } from '~/lib/targetdb/db';

type PlaygroundToolsConfig = {
  projectConnection: string | undefined;
  dbUrl: string | undefined;
  userId: string | undefined;
};

export function buildPlaygroundTools(config: PlaygroundToolsConfig): Record<string, Tool> {
  var toolsets: Toolset[] = [commonToolset, playbookToolset];
  let connString: string | null = config.dbUrl ?? null;

  // Set up user ID provider if configured
  if (config.userId) {
    setUserIdProvider(async () => config.userId);

    /// XXX: The use of 'Connection' currently breaks the playground due to next dependency issues.
    if (config.projectConnection && config.projectConnection !== '') {
      const [projectName, connectionName] = config.projectConnection.split('/');
      if (!projectName || !connectionName) {
        throw new Error('MASTRA_PROJECT_CONNECTION must be in format "projectName/connectionName"');
      }
      const connGetter = createConnectionGetter(projectName, connectionName);

      toolsets.push(
        new DBClusterTools(async () => {
          const connection = await connGetter();
          return { connection, asUserId: config.userId };
        })
      );

      if (!connString) {
        const targetDBPoolGetter = createTargetDBPoolGetter(connGetter);
        toolsets.push(new DBSQLTools(targetDBPoolGetter));
      }
    }
  } else if (!!connString) {
    toolsets.push(new DBSQLTools(getTargetDbPool(connString)));
  }

  return mergeToolsets(...toolsets);
}

function createConnectionGetter(projectName: string, connectionName?: string): () => Promise<Connection> {
  let cachedConnection: Connection | null = null;
  return async () => {
    if (cachedConnection) {
      return cachedConnection;
    }

    // First find the project by name where user has access
    const project = await getProjectByName(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found or access denied`);
    }

    const connection = connectionName
      ? await getConnectionByName(project.id, connectionName)
      : await getDefaultConnection(project.id);
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
