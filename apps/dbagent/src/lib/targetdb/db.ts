import { Client } from 'pg';

export async function getTargetDbConnection(connectionString: string): Promise<Client> {
  let modifiedConnectionString = connectionString;
  let sslConfig = undefined;
  if (connectionString.includes('sslmode=require')) {
    // Remove sslmode=require from connection string to avoid duplicate SSL config
    modifiedConnectionString = connectionString.replace(/[\s;]?sslmode=require/g, '');
    sslConfig = {
      rejectUnauthorized: false // Allow self-signed certificates
    };
  }
  const client = new Client({
    connectionString: modifiedConnectionString,
    ssl: sslConfig
  });

  await client.connect();
  return client;
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

export async function getTableStats(connString: string): Promise<TableStat[]> {
  const client = await getTargetDbConnection(connString);
  try {
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
  } finally {
    await client.end();
  }
}

export interface PgExtension {
  name: string;
  default_version: string;
  installed_version: string;
}

export async function getExtensions(connString: string): Promise<PgExtension[]> {
  const client = await getTargetDbConnection(connString);
  try {
    const result = await client.query('SELECT name, default_version, installed_version FROM pg_available_extensions');

    // Sort installed extensions to the top
    return result.rows.sort((a, b) => {
      if (a.installed_version && !b.installed_version) return -1;
      if (!a.installed_version && b.installed_version) return 1;
      return a.name.localeCompare(b.name);
    });
  } finally {
    await client.end();
  }
}

export interface PerformanceSetting {
  name: string;
  setting: string;
  unit: string;
  source: string;
  description: string;
}

export async function getPerformanceSettings(connString: string): Promise<PerformanceSetting[]> {
  const client = await getTargetDbConnection(connString);
  try {
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
  } finally {
    await client.end();
  }
}

export async function getVacuumSettings(connString: string): Promise<PerformanceSetting[]> {
  const client = await getTargetDbConnection(connString);
  try {
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
  } finally {
    await client.end();
  }
}

export interface ActiveQuery {
  pid: number;
  state: string;
  query: string;
  duration: number;
  wait_event_type: string | null;
  wait_event: string | null;
}

export async function getCurrentActiveQueries(connString: string): Promise<ActiveQuery[]> {
  const client = await getTargetDbConnection(connString);
  try {
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
  } finally {
    await client.end();
  }
}

export interface BlockedQuery {
  blocked_pid: number;
  blocked_query: string;
  blocking_pid: number;
  blocking_query: string;
  blocked_duration: number;
}

export async function getQueriesWaitingOnLocks(connString: string): Promise<BlockedQuery[]> {
  const client = await getTargetDbConnection(connString);
  try {
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
  } finally {
    await client.end();
  }
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

export async function getVacuumStats(connString: string): Promise<VacuumStats[]> {
  const client = await getTargetDbConnection(connString);
  try {
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
  } finally {
    await client.end();
  }
}
