import { pool } from './db';

export type DbConnection = {
  id: number;
  name: string;
  connstring: string;
  is_default: boolean;
};

export async function listConnections(): Promise<DbConnection[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, name, connstring, is_default FROM connections');
    return result.rows;
  } catch (error) {
    console.error('Error listing connections:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getDefaultConnection(): Promise<DbConnection | null> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id, name, connstring FROM connections WHERE is_default = true');
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching connection:', error);
    return null;
  }
}

export async function getConnection(id: number): Promise<DbConnection | null> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, name, connstring, is_default FROM connections WHERE id = $1', [id]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function makeConnectionDefault(id: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE connections SET is_default = false WHERE is_default = true');
    await client.query('UPDATE connections SET is_default = true WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteConnection(id: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if this was the default connection
    const wasDefault = await client.query('SELECT is_default FROM connections WHERE id = $1', [id]);

    // Delete the connection
    await client.query('DELETE FROM assoc_instance_connections WHERE connection_id = $1', [id]);
    await client.query('DELETE FROM dbinfo WHERE connid = $1', [id]);
    await client.query('DELETE FROM connections WHERE id = $1', [id]);

    // If it was default, try to make another connection default
    if (wasDefault.rows[0]?.is_default) {
      const nextConnection = await client.query('SELECT id FROM connections LIMIT 1');
      if (nextConnection.rows.length > 0) {
        await client.query('UPDATE connections SET is_default = true WHERE id = $1', [nextConnection.rows[0].id]);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addConnection({ name, connstring }: { name: string; connstring: string }): Promise<DbConnection> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if this is the first connection
    const countResult = await client.query('SELECT COUNT(*) FROM connections');
    const isFirst = parseInt(countResult.rows[0].count) === 0;

    const result = await client.query(
      'INSERT INTO connections(name, connstring, is_default) VALUES($1, $2, $3) RETURNING id, name, connstring, is_default',
      [name, connstring, isFirst]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateConnection({
  id,
  name,
  connstring
}: {
  id: number;
  name: string;
  connstring: string;
}): Promise<DbConnection> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE connections SET name = $1, connstring = $2 WHERE id = $3 RETURNING id, name, connstring, is_default',
      [name, connstring, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Connection not found');
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}
