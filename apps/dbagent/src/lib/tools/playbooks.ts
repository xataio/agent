const SLOW_QUERIES_PLAYBOOK = `
Follow the following steps to find and troubleshoot slow queries:

Step 1:
Use the tool getSlowQueries to find the slow queries.

Step 2:
Pick a query to investigate. This doesn't have to be the slowest query. 
Prefer a SELECT query, avoid UPDATE, DELETE, INSERT. 
Avoid introspection queries, like the ones involving pg_catalog or information_schema. THIS IS VERY IMPORTANT.
Avoid queries on the kine table.
Include the query in your summary, but format it on multiple lines, so that no line is longer than 80 characters.


Step 3:
Use the tool findTableSchema to find the schema of the table involved in the slow query you picked.
Use the tool describeTable to describe the table you found.

Step 4:
Use the tool explainQuery to explain the slow queries. Make sure to pass the schema you found to the tool. 
Also, it's very important to replace the query parameters ($1, $2, etc) with the actual values. Generate your own values, but
  take into account the data types of the columns.

Step 5:
If the previous step indicates that an index is missing, tell the user the exact DDL to create the index.

At the end:
After you are finished, make a summary of your findings: the slow query summary (don't include the actual query unless it's short),
the reason for which is slow, and the DDL to create the index if you found one. Also say what sort of improvement the user can expect
from the index.
`;

const GENERAL_MONITORING_PLAYBOOK = `
Objective:
To assess and ensure the optimal performance of the PostgreSQL database by reviewing key metrics, logs, and slow queries.

Step 1:
Check CPU Utilization:

Retrieve and analyze the CPU utilization metrics.
Ensure CPU usage is within acceptable limits (e.g., below 60%).

Step 2:
Review Other Key Metrics:

Freeable Memory: Ensure sufficient memory is available (e.g., above 20 GB).
Database Connections: Monitor for spikes; ensure connections are within expected limits.
Read/Write IOPS: Check for any unusual spikes or bottlenecks.
Disk Queue Depth: Ensure it remains at 0 to avoid I/O bottlenecks.

Step 3:
Analyze Logs:

Retrieve recent logs and look for warnings or errors.

Step 4:
Evaluate Slow Queries:

Retrieve and review slow queries.
Identify known queries and ensure they are optimized or deemed acceptable.

Step 5:
Document Findings:

Record any issues found and actions taken.
Note any recurring patterns or areas for improvement.
`;

export function getPlaybook(name: string): string {
  switch (name) {
    case 'investigateSlowQueries':
      return SLOW_QUERIES_PLAYBOOK;
    case 'generalMonitoring':
      return GENERAL_MONITORING_PLAYBOOK;
    default:
      return `Error:Playbook ${name} not found`;
  }
}

export function listPlaybooks(): string[] {
  return ['investigateSlowQueries', 'generalMonitoring'];
}
