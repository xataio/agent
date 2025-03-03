export interface Playbook {
  name: string;
  description: string;
  content: string;
  isBuiltIn: boolean;
}

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

const TUNING_PLAYBOOK = `
Objective: Recommend performance and vacuum settings for the database.

Step 1:
Use the getTablesAndInstanceInfo tool to gather what you know about the database and the cluster/instance type

Step 2:
Think about what CPU/memory does that AWS instance class have?

Step 3:
Given the information you collected above, think about the ideal settings for the following parameters: 
- max_connections 
- shared_buffers 
- effective_cache_size
- maintenance_work_mem
- checkpoint_completion_target
- wal_buffers
- default_statistics_target
- random_page_cost
- effective_io_concurrency
- work_mem
- huge_pages
- min_wal_size
- max_wal_size
- max_worker_processes
- max_parallel_workers_per_gather
- max_parallel_workers
- max_parallel_maintenance_workers.

Step 4:
Now compare with the value you read via the tool getPerformanceAndVacuumSettings and see if there's anything you'd change.

Report your findings in a structured way, with the settings you'd change, and the reason for the change. Highlight the most important changes first.
`;

const INVESTIGATE_HIGH_CPU_USAGE_PLAYBOOK = `
Objective:
 To investigate and resolve high CPU usage in the PostgreSQL database.

Step 1:
Use the tool getCurrentActiveQueries to get the currently active queries. Consider the state and the duration of the queries,
to see if there is any particular query that is causing the high CPU usage. If it is, report that to the user.

Step 2:
Check if there are any queries that are blocked waiting on locks. Use the tool getQueriesWaitingOnLocks to get the queries that are blocked waiting on locks.
If there are, report that to the user.

Step 3:
Check IOPS and disk queue depth. Use the tool getInstanceMetric to get the IOPS and disk queue depth.
If there are any unusual spikes or bottlenecks, report that to the user.

Step 4:
Get the vacuum stats for the top tables in the database. Use the tool getVacuumStats to get the vacuum stats.
If there are any tables with a high number of dead tuples, report that to the user.

Step 5:
Check the slow queries. Use the tool getSlowQueries to get the slow queries.
If there are any slow queries, report that to the user.

Step 6:
Check the logs. Use the tool getLogs to get the logs.
If there are any unusual logs, report that to the user.

Step 7:
Based on all the information you have gathered, make a summary of your findings and report them to the user.
Be very specific about the queries you found and the reason for which they are slow.
`;

export function getPlaybook(name: string): string {
  switch (name) {
    case 'investigateSlowQueries':
      return SLOW_QUERIES_PLAYBOOK;
    case 'generalMonitoring':
      return GENERAL_MONITORING_PLAYBOOK;
    case 'tuneSettings':
      return TUNING_PLAYBOOK;
    case 'investigateHighCpuUsage':
      return INVESTIGATE_HIGH_CPU_USAGE_PLAYBOOK;
    default:
      return `Error:Playbook ${name} not found`;
  }
}

export function listPlaybooks(): string[] {
  return ['investigateSlowQueries', 'generalMonitoring', 'tuneSettings', 'investigateHighCpuUsage'];
}

export function getBuiltInPlaybooks(): Playbook[] {
  return [
    {
      name: 'investigateSlowQueries',
      description: 'Investigate slow queries using pg_stat_statements and EXPLAIN calls.',
      content: SLOW_QUERIES_PLAYBOOK,
      isBuiltIn: true
    },
    {
      name: 'generalMonitoring',
      description: 'General monitoring of the database, checking logs, slow queries, main metrics, etc.',
      content: GENERAL_MONITORING_PLAYBOOK,
      isBuiltIn: true
    },
    {
      name: 'tuneSettings',
      description: 'Tune configuration settings for the database, based on the instance type, the database schema. ',
      content: TUNING_PLAYBOOK,
      isBuiltIn: true
    },
    {
      name: 'investigateHighCpuUsage',
      description: 'Investigate high CPU usage. This playbook should be execute while the CPU usage is elevated.',
      content: INVESTIGATE_HIGH_CPU_USAGE_PLAYBOOK,
      isBuiltIn: true
    }
  ];
}

export function getPlaybookDetails(name: string): Playbook | undefined {
  return getBuiltInPlaybooks().find((playbook) => playbook.name === name);
}
