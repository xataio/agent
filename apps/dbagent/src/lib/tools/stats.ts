import {
  ClientBase,
  getConnectionsGroups,
  getConnectionsStats,
  getCurrentActiveQueries,
  getQueriesWaitingOnLocks,
  getVacuumStats
} from '../targetdb/db';

export async function toolCurrentActiveQueries(client: ClientBase): Promise<string> {
  const activeQueries = await getCurrentActiveQueries(client);
  const result = JSON.stringify(activeQueries);
  console.log(result);
  return result;
}

export async function toolGetQueriesWaitingOnLocks(client: ClientBase): Promise<string> {
  const blockedQueries = await getQueriesWaitingOnLocks(client);
  const result = JSON.stringify(blockedQueries);
  console.log(result);
  return result;
}

export async function toolGetVacuumStats(client: ClientBase): Promise<string> {
  const vacuumStats = await getVacuumStats(client);
  const result = JSON.stringify(vacuumStats);
  console.log(result);
  return result;
}

export async function toolGetConnectionsStats(client: ClientBase): Promise<string> {
  const stats = await getConnectionsStats(client);
  const result = JSON.stringify(stats);
  console.log(result);
  return result;
}

export async function toolGetConnectionsGroups(client: ClientBase): Promise<string> {
  const groups = await getConnectionsGroups(client);
  const result = JSON.stringify(groups);
  console.log(result);
  return result;
}
