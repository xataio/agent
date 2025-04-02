'use server';

import { getConnection, getConnectionByName, getDefaultConnection, listConnections } from '~/lib/db/connections';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getProjectById } from '~/lib/db/projects';
import {
  deleteSchedule,
  getSchedule,
  getSchedulesByProjectId,
  insertSchedule,
  updateSchedule,
  type Schedule
} from '~/lib/db/schedules';

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
  const db = await getUserSessionDBAccess();
  return getConnectionByName(db, projectId, name);
}

export async function getProjectSchedules(projectId: string) {
  const db = await getUserSessionDBAccess();
  return await getSchedulesByProjectId(db, projectId);
}

export async function getProjectSchedule(scheduleId: string) {
  const db = await getUserSessionDBAccess();
  return getSchedule(db, scheduleId);
}

export async function createProjectSchedule(schedule: Omit<Schedule, 'id'>) {
  const db = await getUserSessionDBAccess();
  return insertSchedule(db, schedule);
}

export async function updateProjectSchedule(schedule: Schedule) {
  const db = await getUserSessionDBAccess();
  return updateSchedule(db, schedule);
}

export async function deleteProjectSchedule(scheduleId: string) {
  const db = await getUserSessionDBAccess();
  return deleteSchedule(db, scheduleId);
}
