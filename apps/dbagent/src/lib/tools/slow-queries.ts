import { ClientBase, describeTable, explainQuery, getSlowQueries } from '../targetdb/db';

export async function toolGetSlowQueries(client: ClientBase, thresholdMs: number): Promise<string> {
  const slowQueries = await getSlowQueries(client, thresholdMs);
  const result = JSON.stringify(slowQueries);
  console.log(result);
  return JSON.stringify(slowQueries);
}

export async function toolExplainQuery(client: ClientBase, schema: string, query: string): Promise<string> {
  const result = await explainQuery(client, schema, query);
  return JSON.stringify(result);
}

export async function toolDescribeTable(client: ClientBase, schema: string, table: string): Promise<string> {
  const result = await describeTable(client, schema, table);
  return JSON.stringify(result);
}
