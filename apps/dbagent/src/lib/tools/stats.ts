import {
  getConnectionsGroups,
  getConnectionsStats,
  getCurrentActiveQueries,
  getQueriesWaitingOnLocks,
  getVacuumStats
} from '../targetdb/db';

export async function toolCurrentActiveQueries(connString: string): Promise<string> {
  const activeQueries = await getCurrentActiveQueries(connString);
  const result = JSON.stringify(activeQueries);
  console.log(result);
  return result;
}

export async function toolGetQueriesWaitingOnLocks(connString: string): Promise<string> {
  const blockedQueries = await getQueriesWaitingOnLocks(connString);
  const result = JSON.stringify(blockedQueries);
  console.log(result);
  return result;
}

export async function toolGetVacuumStats(connString: string): Promise<string> {
  const vacuumStats = await getVacuumStats(connString);
  const result = JSON.stringify(vacuumStats);
  console.log(result);
  return result;
}

export async function toolGetConnectionsStats(connString: string): Promise<string> {
  const stats = await getConnectionsStats(connString);
  const result = JSON.stringify(stats);
  console.log(result);
  return result;
}

export async function toolGetConnectionsGroups(connString: string): Promise<string> {
  const groups = await getConnectionsGroups(connString);
  const result = JSON.stringify(groups);
  console.log(result);
  return result;
}
