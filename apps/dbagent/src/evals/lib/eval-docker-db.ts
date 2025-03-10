import Docker from 'dockerode';
import { Client } from 'pg';

export type PostgresConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionString: string;
  container: Docker.Container;
};

const docker = new Docker();

type PostgresContainerOptions = {
  image?: string;
  port?: number;
};

export const startPostgresContainer = async (userOptions: PostgresContainerOptions = {}): Promise<PostgresConfig> => {
  const { image = 'postgres:17', port = 9877 } = userOptions;
  const container = await docker.createContainer({
    Image: image,
    // name: 'dbagent-eval-postgres',
    Env: ['POSTGRES_USER=test', 'POSTGRES_PASSWORD=test', 'POSTGRES_DB=testdb'],
    ExposedPorts: { '5432/tcp': {} },
    HostConfig: { PortBindings: { '5432/tcp': [{ HostPort: port.toString() }] } }
  });

  await container.start();

  console.log(`Postgres container started with image ${image} on port ${port}`);

  const dbConfig = {
    host: 'localhost',
    port,
    user: 'test',
    password: 'test',
    database: 'testdb'
  };

  return {
    ...dbConfig,
    container,
    connectionString: `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?sslmode=disable`
  };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runSql = async (sql: string, postgresConfig: PostgresConfig) => {
  await delay(1000);
  const client = new Client({
    host: postgresConfig.host,
    port: postgresConfig.port,
    user: postgresConfig.user,
    password: postgresConfig.password,
    database: postgresConfig.database
  });
  await client.connect();
  await client.query(sql);
  await client.end();
};
