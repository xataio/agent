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
Ensure CPU usage is within acceptable limits.

Step 2:
Review Other Key Metrics:

Freeable Memory: Ensure sufficient memory is available.
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
Use the getClusterInfo or getInstanceInfo tool to gather what you know about the cluster/instance type.
Use the getTablesInfo tool to gather what you know about the tables in the database.
Retrieve the main metrics (CPU, free memory, etc) for the past 24h.

Step 2:
Think about what CPU/memory does that the instance class have?

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
Keep in mind the cloud provider when making the recommendations.
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

const INVESTIGATE_HIGH_CONNECTION_COUNT_PLAYBOOK = `
Objective:
To investigate and resolve high connection count in the PostgreSQL database.

Step 1:
Use the tool getConnectionsStats to get the connections stats. If the 
percentage of connections utilization is very low, you can stop here. Proceed with the next step only if the
percentage is at least 20%.

Step 2:
Get the metric for the number of connections. Check if the trend is upwards and consider
how much time there is until the max is reached. If it looks like the max will be reached in the 
next hour, this should be alert level.

Step 3:
If the percentage of connections utilization is high, get the instance info 
(with the tool getTablesAndInstanceInfo) and think about the stats you have gathered so far.
Is the max_connections appropriate for the instance type? Are there many idle connections?

Step 4:
Call the tool getConnectionsGroups to get an overview of the open connections.
Try to figure out where are the bulk of the connections coming from. 
Are there many many "idle in transaction" connections? Think about the wait_event as well.

Step 5:
If there are many idle connections, get the oldest idle connections with the tool getOldestIdleConnections.

Step 6:
Based on all the information you have gathered, make a summary of your findings and report them to the user.
Provide actionable advice to the user. If for example you recommend killing old idle connections,
provide the query to do so. However, use judgement in selecting only the connections that are least likely to
impact users (for example, because they are very old).
If you recommend changing the max_connections parameter, provide the new value.
`;

const INVESTIGATE_LOW_MEMORY_PLAYBOOK = `
Objective:
To investigate and resolve low freeable memory in the PostgreSQL database.

Step 1:
Get the freeable memory metric using the tool getInstanceMetric.

Step 3:
Get the cluster/instance details and compare the freeable memory with the amount of memory available.

Step 4:
Check the logs for any indications of memory pressure or out of memory errors. If there are,
make sure to report that to the user. Also this would mean that the situation is critical.

Step 4:
Check active queries. Use the tool getConnectionsGroups to get the currently active queries.
If a user or application stands out for doing a lot of work, record that to indicate to the user.

Step 5:
Check the work_mem setting and shared_buffers setting. Think if it would make sense to reduce these
in order to free up memory.

Step 6:
If there is no clear root cause for using memory, suggest to the user to scale up the Postgres instance.
Recommend a particular instance class, keeping in mind the cloud provider.
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
    case 'investigateHighConnectionCount':
      return INVESTIGATE_HIGH_CONNECTION_COUNT_PLAYBOOK;
    case 'investigateLowMemory':
      return INVESTIGATE_LOW_MEMORY_PLAYBOOK;
    default:
      return `Error:Playbook ${name} not found`;
  }
}

export function listPlaybooks(): string[] {
  //TODO: add the custom playbooks
  return [
    'generalMonitoring',
    'investigateSlowQueries',
    'investigateHighCpuUsage',
    'investigateLowMemory',
    'investigateHighConnectionCount',
    'tuneSettings'
  ];
}

export function getBuiltInPlaybooks(): Playbook[] {
  return [
    {
      name: 'generalMonitoring',
      description: 'General monitoring of the database, checking logs, slow queries, main metrics, etc.',
      content: GENERAL_MONITORING_PLAYBOOK,
      isBuiltIn: true
    },
    {
      name: 'investigateSlowQueries',
      description: 'Investigate slow queries using pg_stat_statements and EXPLAIN calls.',
      content: SLOW_QUERIES_PLAYBOOK,
      isBuiltIn: true
    },
    {
      name: 'investigateHighCpuUsage',
      description: 'Investigate high CPU usage. This playbook should be execute while the CPU usage is elevated.',
      content: INVESTIGATE_HIGH_CPU_USAGE_PLAYBOOK,
      isBuiltIn: true
    },
    {
      name: 'investigateLowMemory',
      description: 'Investigate low freeable memory. This playbook should be execute while the freeable memory is low.',
      content: INVESTIGATE_LOW_MEMORY_PLAYBOOK,
      isBuiltIn: true
    },
    {
      name: 'investigateHighConnectionCount',
      description:
        'Investigate high connection count. This playbook should be execute while the connection count is elevated.',
      content: INVESTIGATE_HIGH_CONNECTION_COUNT_PLAYBOOK,
      isBuiltIn: true
    },
    {
      name: 'tuneSettings',
      description: 'Tune configuration settings for the database, based on the instance type, the database schema. ',
      content: TUNING_PLAYBOOK,
      isBuiltIn: true
    }
  ];
}

export function getPlaybookDetails(name: string): Playbook | undefined {
  return getBuiltInPlaybooks().find((playbook) => playbook.name === name);
}
