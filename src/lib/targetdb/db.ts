import pg from 'pg';

export type PoolConfig = pg.PoolConfig;
export type Pool = pg.Pool;
export type Client = pg.Client;
export type ClientBase = pg.ClientBase;

export function getTargetDbPool(connectionString: string, poolConfig: Omit<PoolConfig, 'connectionString'> = {}): Pool {
  const parsed = parseConnectionString(connectionString);
  const config = { ...poolConfig, ...parsed };
  if (!config.max) config.max = 1;

  return new pg.Pool(config);
}

export async function getTargetDbConnection(connectionString: string): Promise<Client> {
  const parsed = parseConnectionString(connectionString);
  const client = new pg.Client({ ...parsed });
  await client.connect();
  return client;
}

function parseConnectionString(connectionString: string): { connectionString: string; ssl?: pg.ClientConfig['ssl'] } {
  let modifiedConnectionString = connectionString;
  let sslConfig: pg.ClientConfig['ssl'] | undefined = undefined;
  if (connectionString.includes('sslmode=require')) {
    // Remove sslmode=require from connection string to avoid duplicate SSL config
    modifiedConnectionString = connectionString.replace(/[\s;]?sslmode=require/g, '');
    sslConfig = {
      rejectUnauthorized: false // Allow self-signed certificates
    };
  }
  return {
    connectionString: modifiedConnectionString,
    ssl: sslConfig
  };
}

export async function withPoolConnection<T>(
  pool: Pool | (() => Promise<Pool>),
  fn: (client: ClientBase) => Promise<T>
): Promise<T> {
  const poolInstance = typeof pool === 'function' ? await pool() : pool;
  const client = await poolInstance.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withTargetDbConnection<T>(
  connectionString: string,
  fn: (client: ClientBase) => Promise<T>
): Promise<T> {
  const client = await getTargetDbConnection(connectionString);
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export interface TableStat {
  name: string;
  schema: string;
  rows: number;
  size: string;
  seqScans: number;
  idxScans: number;
  nTupIns: number;
  nTupUpd: number;
  nTupDel: number;
}

export async function getTableStats(client: ClientBase): Promise<TableStat[]> {
  const result = await client.query(`
    SELECT
        c.oid AS oid,
        t.table_name AS name,
        t.table_schema AS schema,
        pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) AS size,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))) AS sizeh,
        ROUND(c.reltuples) AS rows,
        s.seq_scan AS seq_scan,
        s.idx_scan AS idx_scan,
        s.n_tup_ins AS n_tup_ins,
        s.n_tup_upd AS n_tup_upd,
        s.n_tup_del AS n_tup_del
    FROM
        information_schema.tables t
    LEFT JOIN
        pg_class c
    ON
        t.table_name = c.relname
        AND t.table_schema = c.relnamespace::regnamespace::text
    LEFT JOIN
        pg_stat_all_tables s
    ON
        c.oid = s.relid
    WHERE
        c.oid IS NOT NULL
        AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY
        size DESC
    LIMIT 100;
`);

  return result.rows.map((row) => ({
    schema: row.schema,
    name: row.name,
    rows: parseInt(row.rows),
    size: row.size,
    seqScans: parseInt(row.seq_scan),
    idxScans: parseInt(row.idx_scan),
    nTupIns: parseInt(row.n_tup_ins),
    nTupUpd: parseInt(row.n_tup_upd),
    nTupDel: parseInt(row.n_tup_del)
  }));
}

export interface PgExtension {
  name: string;
  default_version: string;
  installed_version: string;
}

export async function getExtensions(client: ClientBase): Promise<PgExtension[]> {
  const result = await client.query('SELECT name, default_version, installed_version FROM pg_available_extensions');

  // Sort installed extensions to the top
  return result.rows.sort((a, b) => {
    if (a.installed_version && !b.installed_version) return -1;
    if (!a.installed_version && b.installed_version) return 1;
    return a.name.localeCompare(b.name);
  });
}

export interface PerformanceSetting {
  name: string;
  setting: string;
  unit: string;
  source: string;
  description: string;
}

export async function getPerformanceSettings(client: ClientBase): Promise<PerformanceSetting[]> {
  const result = await client.query(`
      SELECT
        name,
        setting,
        unit,
        source,
        short_desc as description
      FROM pg_settings
      WHERE name IN (
        'max_connections',
        'work_mem',
        'shared_buffers',
        'maintenance_work_mem',
        'lock_timeout',
        'idle_in_transaction_session_timeout',
        'checkpoint_completion_target',
        'idle_session_timeout',
        'default_transaction_isolation',
        'max_wal_size',
        'shared_buffers',
        'log_min_duration_statement',
        'effective_cache_size',
        'wal_buffers',
        'effective_io_concurrency',
        'random_page_cost',
        'seq_page_cost',
        'huge_pages'
      )
    `);
  return result.rows;
}

export async function getVacuumSettings(client: ClientBase): Promise<PerformanceSetting[]> {
  const result = await client.query(`
      SELECT
        name,
        setting,
        unit,
        source,
        short_desc as description
      FROM pg_settings
      WHERE name IN (
        'autovacuum',
        'autovacuum_vacuum_threshold',
        'autovacuum_vacuum_insert_threshold',
        'autovacuum_analyze_threshold',
        'autovacuum_freeze_max_age',
        'track_counts'
      );
    `);
  return result.rows;
}

export interface ActiveQuery {
  pid: number;
  state: string;
  query: string;
  duration: number;
  wait_event_type: string | null;
  wait_event: string | null;
}

export async function getCurrentActiveQueries(client: ClientBase): Promise<ActiveQuery[]> {
  const result = await client.query(`
      SELECT
        pid,
        state,
        EXTRACT(EPOCH FROM (NOW() - query_start))::INTEGER as duration,
        wait_event_type,
        wait_event,
        query
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND pid != pg_backend_pid()
      ORDER BY duration DESC
      LIMIT 500;
    `);
  return result.rows;
}

export interface BlockedQuery {
  blocked_pid: number;
  blocked_query: string;
  blocking_pid: number;
  blocking_query: string;
  blocked_duration: number;
}

export async function getQueriesWaitingOnLocks(client: ClientBase): Promise<BlockedQuery[]> {
  const result = await client.query(`
      WITH blocked_queries AS (
        SELECT
          blocked.pid as blocked_pid,
          blocked.query as blocked_query,
          blocking.pid as blocking_pid,
          blocking.query as blocking_query,
          EXTRACT(EPOCH FROM (NOW() - blocked.query_start))::INTEGER as blocked_duration
        FROM pg_stat_activity blocked
        JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
        JOIN pg_locks blocking_locks ON blocked_locks.locktype = blocking_locks.locktype
          AND blocked_locks.database IS NOT DISTINCT FROM blocking_locks.database
          AND blocked_locks.relation IS NOT DISTINCT FROM blocking_locks.relation
          AND blocked_locks.page IS NOT DISTINCT FROM blocking_locks.page
          AND blocked_locks.tuple IS NOT DISTINCT FROM blocking_locks.tuple
          AND blocked_locks.virtualxid IS NOT DISTINCT FROM blocking_locks.virtualxid
          AND blocked_locks.transactionid IS NOT DISTINCT FROM blocking_locks.transactionid
          AND blocked_locks.classid IS NOT DISTINCT FROM blocking_locks.classid
          AND blocked_locks.objid IS NOT DISTINCT FROM blocking_locks.objid
          AND blocked_locks.objsubid IS NOT DISTINCT FROM blocking_locks.objsubid
          AND blocked_locks.pid != blocking_locks.pid
        JOIN pg_stat_activity blocking ON blocking_locks.pid = blocking.pid
        WHERE NOT blocked_locks.granted
          AND blocked.pid != pg_backend_pid()
      )
      SELECT * FROM blocked_queries ORDER BY blocked_duration DESC;
    `);
  return result.rows;
}

export interface VacuumStats {
  schemaname: string;
  table_name: string;
  last_vacuum: Date | null;
  last_autovacuum: Date | null;
  vacuum_count: number;
  autovacuum_count: number;
  dead_tuples: number;
  live_tuples: number;
  modifications_since_analyze: number;
}

export async function getVacuumStats(client: ClientBase): Promise<VacuumStats[]> {
  const result = await client.query(`
      SELECT
        schemaname,
        relname as table_name,
        last_vacuum,
        last_autovacuum,
        vacuum_count,
        autovacuum_count,
        n_dead_tup as dead_tuples,
        n_live_tup as live_tuples,
        n_mod_since_analyze as modifications_since_analyze
      FROM pg_stat_user_tables
      ORDER BY n_dead_tup DESC
      LIMIT 50;
    `);
  return result.rows;
}

export interface ConnectionsStats {
  total_connections: number;
  non_idle_connections: number;
  max_connections: number;
  connections_utilization_pctg: number;
}

export async function getConnectionsStats(client: ClientBase): Promise<ConnectionsStats[]> {
  const result = await client.query(`
    SELECT
        A.total_connections,
    A.non_idle_connections,
    B.max_connections,
    round((100 * A.total_connections::numeric / B.max_connections::numeric), 2) connections_utilization_pctg
FROM
    (select count(1) as total_connections, sum(case when state!='idle' then 1 else 0 end) as non_idle_connections from pg_stat_activity) A,
    (select setting as max_connections from pg_settings where name='max_connections') B;
`);
  return result.rows;
}

export interface ConnectionDetails {
  total_connections: number;
  state: string;
  user: string;
  application_name: string;
  client_addr: string;
  wait_event_type: string;
  wait_event: string;
}

export async function getConnectionsGroups(client: ClientBase): Promise<ConnectionDetails[]> {
  const result = await client.query(`
SELECT
    count(*) AS total_connections,
    state,
    usename AS user,
    application_name,
    client_addr,
    wait_event_type,
    wait_event
FROM pg_stat_activity
GROUP BY
    state,
    usename,
    application_name,
    client_addr,
    wait_event_type,
    wait_event
ORDER BY total_connections DESC;`);
  return result.rows;
}

export async function getOldestIdleConnections(client: ClientBase): Promise<ConnectionDetails[]> {
  const result = await client.query(`
      SELECT * FROM pg_stat_activity WHERE state = 'idle' ORDER BY query_start ASC LIMIT 10;
    `);
  return result.rows;
}

interface SlowQuery {
  calls: number;
  max_exec_secs: number;
  mean_exec_secs: number;
  total_exec_secs: number;
  query: string;
}

export async function getSlowQueries(client: ClientBase, thresholdMs: number): Promise<SlowQuery[]> {
  const query = `
    SELECT
      calls,
      round(max_exec_time/1000) max_exec_secs,
      round(mean_exec_time/1000) mean_exec_secs,
      round(total_exec_time/1000) total_exec_secs,
      query
    FROM pg_stat_statements
    WHERE max_exec_time > $1
    ORDER BY total_exec_time DESC
    LIMIT 10;
  `;
  const result = await client.query(query, [thresholdMs]);
  return result.rows;
}

export async function explainQuery(client: ClientBase, schema: string, query: string): Promise<string> {
  if (query.includes('$1') || query.includes('$2') || query.includes('$3') || query.includes('$4')) {
    return 'The query seems to contain placeholders ($1, $2, etc). Replace them with actual values and try again.';
  }
  let toReturn = '';
  try {
    await client.query('BEGIN');
    await client.query(`SET search_path TO ${schema}`);
    const explainQuery = `EXPLAIN ${query}`;
    console.log(schema);
    console.log(explainQuery);
    const result = await client.query(explainQuery);
    console.log(result.rows);
    toReturn = result.rows.map((row: { [key: string]: string }) => row['QUERY PLAN']).join('\n');
  } catch (error) {
    console.error('Error explaining query', error);
    toReturn = 'I could not run EXPLAIN on that query. Try a different method.';
  }
  await client.query('ROLLBACK');
  return toReturn;
}

export async function describeTable(client: ClientBase, schema: string, table: string): Promise<string> {
  console.log('schema', schema);
  console.log('table', table);
  // Get column information
  const columnQuery = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = $1
    AND table_name = $2
    ORDER BY ordinal_position;
  `;

  // Get index information
  const indexQuery = `
    SELECT
      i.relname as index_name,
      array_to_string(array_agg(a.attname ORDER BY k.i), ', ') as column_names,
      ix.indisunique as is_unique,
      ix.indisprimary as is_primary
    FROM
      pg_class t,
      pg_class i,
      pg_index ix,
      pg_attribute a,
      generate_subscripts(ix.indkey, 1) k(i)
    WHERE
      t.oid = ix.indrelid
      AND i.oid = ix.indexrelid
      AND a.attrelid = t.oid
      AND a.attnum = ix.indkey[k.i]
      AND t.relkind = 'r'
      AND t.relname = $1
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2)
    GROUP BY
      i.relname,
      ix.indisunique,
      ix.indisprimary
    ORDER BY
      i.relname;
  `;
  const columns = await client.query(columnQuery, [schema, table]);
  const indexes = await client.query(indexQuery, [table, schema]);

  let description = `Table: ${schema}.${table}\n\nColumns:\n`;

  columns.rows.forEach((col: any) => {
    description += `${col.column_name} ${col.data_type}`;
    description += col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
    if (col.column_default) {
      description += ` DEFAULT ${col.column_default}`;
    }
    description += '\n';
  });

  description += '\nIndexes:\n';
  indexes.rows.forEach((idx: any) => {
    description += `${idx.index_name} ON (${idx.column_names})`;
    if (idx.is_primary) {
      description += ' PRIMARY KEY';
    } else if (idx.is_unique) {
      description += ' UNIQUE';
    }
    description += '\n';
  });

  return description;
}

export async function findTableSchema(client: ClientBase, table: string): Promise<string> {
  const result = await client.query(
    `
      SELECT
      schemaname as schema,
      pg_total_relation_size(schemaname || '.' || tablename) as total_bytes
    FROM pg_tables
    WHERE tablename = $1
    ORDER BY total_bytes DESC
    LIMIT 1;
  `,
    [table]
  );
  if (result.rows.length === 0) {
    return 'public'; // Default to public if no match found
  }
  return result.rows[0].schema;
}
