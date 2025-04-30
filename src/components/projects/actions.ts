'use server';

import { getUserSessionDBAccess } from '~/lib/db/db';
import { createProject, deleteProject, updateProject } from '~/lib/db/projects';
import { CloudProvider, Project } from '~/lib/db/schema';

export async function actionCreateProject(name: string, cloudProvider: CloudProvider) {
  const dbAccess = await getUserSessionDBAccess();
  return createProject(dbAccess, { name, cloudProvider });
}

export async function actionDeleteProject(id: string) {
  const dbAccess = await getUserSessionDBAccess();
  return deleteProject(dbAccess, { id });
}

export async function actionUpdateProject(id: string, update: Partial<Omit<Project, 'id'>>) {
  const dbAccess = await getUserSessionDBAccess();
  return updateProject(dbAccess, id, update);
}
