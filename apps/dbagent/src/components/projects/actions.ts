'use server';

import { getUserSessionDBAccess } from '~/lib/db/db';
import { CloudProviderType, createProject, deleteProject, Project, updateProject } from '~/lib/db/projects';

export async function actionCreateProject(name: string, cloudProvider: CloudProviderType) {
  const db = await getUserSessionDBAccess();
  return createProject(db, { name, cloudProvider });
}

export async function actionDeleteProject(id: string) {
  const db = await getUserSessionDBAccess();
  return deleteProject(db, { id });
}

export async function actionUpdateProject(id: string, update: Partial<Omit<Project, 'id'>>) {
  const db = await getUserSessionDBAccess();
  return updateProject(db, id, update);
}
