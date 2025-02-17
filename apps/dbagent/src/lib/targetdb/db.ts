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
        'idle_session_timeout',
        'default_transaction_isolation',
        'max_wal_size',
        'shared_buffers',
        'log_min_duration_statement',
        'effective_cache_size',
        'wal_buffers',
        'effective_io_concurrency',
        'random_page_cost',
        'seq_page_cost'
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
