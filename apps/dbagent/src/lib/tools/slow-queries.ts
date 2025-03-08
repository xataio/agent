import { describeTable, explainQuery, getSlowQueries } from '../targetdb/db';

export async function toolGetSlowQueries(connString: string, thresholdMs: number): Promise<string> {
  const slowQueries = await getSlowQueries(connString, thresholdMs);
  const result = JSON.stringify(slowQueries);
  console.log(result);
  return JSON.stringify(slowQueries);
}

export async function toolExplainQuery(connString: string, schema: string, query: string): Promise<string> {
  const result = await explainQuery(connString, schema, query);
  return result;
}

export async function toolDescribeTable(connString: string, schema: string, table: string): Promise<string> {
  const result = await describeTable(connString, schema, table);
  return result;
}
