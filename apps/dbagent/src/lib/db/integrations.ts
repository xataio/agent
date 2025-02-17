import { pool } from './db';

export type AwsIntegration = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

type IntegrationModules = {
  aws: AwsIntegration;
};

export async function saveIntegration<T extends keyof IntegrationModules>(name: T, data: IntegrationModules[T]) {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO integrations(name, data) VALUES($1, $2) ON CONFLICT (name) DO UPDATE SET data = $2',
      [name, data]
    );
  } finally {
    client.release();
  }
}

export async function getIntegration<T extends keyof IntegrationModules>(
  name: string
): Promise<IntegrationModules[T] | null> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM integrations WHERE name = $1', [name]);
    return result.rows[0]?.data;
  } finally {
    client.release();
  }
}
