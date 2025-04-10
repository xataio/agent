'use server';

import { getConnection, getConnectionByName, getDefaultConnection, listConnections } from '~/lib/db/connections';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getProjectById } from '~/lib/db/projects';
import {
  deleteSchedule,
  getSchedule,
  getSchedulesByProjectId,
  insertSchedule,
  updateSchedule
} from '~/lib/db/schedules';
import { Schedule, ScheduleInsert } from '~/lib/db/schema';

export async function getProject(projectId: string) {
  const dbAccess = await getUserSessionDBAccess();
  return getProjectById(dbAccess, projectId);
}

export async function getProjectConnectionList(projectId: string) {
  const dbAccess = await getUserSessionDBAccess();
  return listConnections(dbAccess, projectId);
}

export async function getDefaultProjectConnection(projectId: string) {
  const dbAccess = await getUserSessionDBAccess();
  return getDefaultConnection(dbAccess, projectId);
}

export async function getProjectConnection(connectionId: string) {
  const dbAccess = await getUserSessionDBAccess();
  return getConnection(dbAccess, connectionId);
}

export async function getProjectConnectionByName(projectId: string, name: string) {
  const dbAccess = await getUserSessionDBAccess();
  return getConnectionByName(dbAccess, projectId, name);
}

export async function getProjectSchedules(projectId: string) {
  const dbAccess = await getUserSessionDBAccess();
  return await getSchedulesByProjectId(dbAccess, projectId);
}

export async function getProjectSchedule(scheduleId: string) {
  const dbAccess = await getUserSessionDBAccess();
  return getSchedule(dbAccess, scheduleId);
}

export async function createProjectSchedule(schedule: ScheduleInsert) {
  const dbAccess = await getUserSessionDBAccess();
  return insertSchedule(dbAccess, schedule);
}

export async function updateProjectSchedule(schedule: Schedule) {
  const dbAccess = await getUserSessionDBAccess();
  return updateSchedule(dbAccess, schedule);
}

export async function deleteProjectSchedule(scheduleId: string) {
  const dbAccess = await getUserSessionDBAccess();
  return deleteSchedule(dbAccess, scheduleId);
}
