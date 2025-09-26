import { ClientBase } from './db';
import { isSingleStatement } from './unsafe-explain';

export async function safeExplainQuery(client: ClientBase, schema: string, queryId: string): Promise<string> {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    return 'Invalid schema name. Only alphanumeric characters and underscores are allowed.';
  }

  // First, fetch the query from pg_stat_statements
  const queryResult = await client.query('SELECT query FROM pg_stat_statements WHERE queryid = $1', [queryId]);

  if (queryResult.rows.length === 0) {
    return 'Query not found in pg_stat_statements for the given queryId';
  }

  const query = queryResult.rows[0].query;

  if (!isSingleStatement(query)) {
    return 'The query is not a single safe statement. Only SELECT, INSERT, UPDATE, DELETE, and WITH statements are allowed.';
  }

  if (query.includes('$1') || query.includes('$2') || query.includes('$3') || query.includes('$4')) {
    // TODO: we could use `GENERIC_PLAN` to still get the plan in this case.
    return 'The query seems to contain placeholders ($1, $2, etc). Replace them with actual values and try again.';
  }

  let toReturn = '';
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '2000ms'");
    await client.query("SET LOCAL lock_timeout = '200ms'");
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
