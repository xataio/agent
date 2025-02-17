interface SlowQuery {
  calls: number;
  max_exec_secs: number;
  mean_exec_secs: number;
  total_exec_secs: number;
  query: string;
}

export async function getSlowQueries(client: any, thresholdMs: number): Promise<SlowQuery[]> {
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

export async function explainQuery(client: any, schema: string, query: string): Promise<string> {
  if (query.includes('$1') || query.includes('$2') || query.includes('$3') || query.includes('$4')) {
    return 'The query seems to contain placeholders ($1, $2, etc). Replace them with actual values and try again.';
  }
  await client.query('BEGIN');
  try {
    await client.query(`SET search_path TO ${schema}`);
    const explainQuery = `EXPLAIN ${query}`;
    console.log(schema);
    console.log(explainQuery);
    const result = await client.query(explainQuery);
    console.log(result.rows);
    return result.rows.map((row: { [key: string]: string }) => row['QUERY PLAN']).join('\n');
  } catch (error) {
    console.error('Error explaining query', error);
    return 'I could not run EXPLAIN on that query. Try a different method.';
  } finally {
    await client.query('ROLLBACK');
  }
}

export async function describeTable(client: any, schema: string, table: string): Promise<string> {
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

  try {
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
  } catch (error) {
    console.error('Error describing table', error);
    return `Could not describe table ${schema}.${table}`;
  }
}
