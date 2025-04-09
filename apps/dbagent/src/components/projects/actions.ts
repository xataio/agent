'use server';

import { getUserSessionDBAccess } from '~/lib/db/db';
import { CloudProviderType, createProject, deleteProject, Project, updateProject } from '~/lib/db/projects';

export async function actionCreateProject(name: string, cloudProvider: CloudProviderType) {
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
