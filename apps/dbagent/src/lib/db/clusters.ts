import { RDSClusterDetailedInfo } from '../aws/rds';
import { pool } from './db';

export type Cluster = {
  cluster_identifier: string;
  integration: string;
  region: string;
  data: RDSClusterDetailedInfo;
};

export async function saveCluster(cluster: Cluster): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO clusters(cluster_identifier, integration, region, data) 
       VALUES($1, $2, $3, $4)
       ON CONFLICT (integration,cluster_identifier) DO UPDATE SET
         region = EXCLUDED.region,
         data = EXCLUDED.data
       RETURNING id`,
      [cluster.cluster_identifier, cluster.integration, cluster.region, cluster.data]
    );
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function associateClusterConnection(clusterId: number, connectionId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('INSERT INTO assoc_cluster_connections(cluster_id, connection_id) VALUES($1, $2)', [
      clusterId,
      connectionId
    ]);
  } finally {
    client.release();
  }
}

export async function getClusterByConnection(connectionId: number): Promise<Cluster | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT i.* FROM clusters i
       INNER JOIN assoc_cluster_connections aic ON i.id = aic.cluster_id 
       WHERE aic.connection_id = $1`,
      [connectionId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function getClusters(): Promise<Cluster[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM clusters');
    return result.rows;
  } finally {
    client.release();
  }
}
