#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import pg from 'pg';
import { z } from 'zod';

async function buildServer(databaseUrl: string) {
  const server = new FastMCP({
    name: 'PostgreSQL',
    version: '0.1.0'
  });

  const resourceBaseUrl = new URL(databaseUrl);
  resourceBaseUrl.protocol = 'postgres:';
  resourceBaseUrl.password = '';

  const client = new pg.Pool({
    connectionString: databaseUrl
  });

  server.addTool({
    name: 'get-slow-queries',
    description: `Get a list of slow queries formatted as a JSON array.
            Contains how many times the query was called, the max execution time in seconds,
            the mean execution time in seconds, the total execution time (all calls together)
            in seconds, and the query itself.`,
    parameters: z.object({
      thresholdMs: z.number().optional().default(5000)
    }),
    execute: async ({ thresholdMs }) => {
      const result = await client.query(
        `
                SELECT 
                calls,
                round(max_exec_time/1000) max_exec_secs,
                round(mean_exec_time/1000) mean_exec_secs, 
                round(total_exec_time/1000) total_exec_secs,
                query 
                FROM pg_stat_statements 
                WHERE max_exec_time > $1 
                ORDER BY total_exec_time DESC 
                LIMIT 10;`,
        [thresholdMs]
      );

      return JSON.stringify(result.rows);
    }
  });

  server.addTool({
    name: 'explain-query',
    description: `Run explain on a a query. Returns the explain plan as received from PostgreSQL.
            The query needs to be complete, it cannot contain $1, $2, etc. If you need to, replace the parameters with your own made up values.
            It's very important that $1, $2, etc. are not passed to this tool. Use the tool describeTable to get the types of the columns.
            If you know the schema, pass it in as well.`,
    parameters: z.object({
      schema: z.string(),
      query: z.string()
    }),
    execute: async ({ schema, query }) => {
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
  });

  return server;
}
