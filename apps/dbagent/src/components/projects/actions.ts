'use server';

import { auth } from '~/auth';
import { removeProject, saveProject, updateProjectName } from '~/lib/db/projects';

export const createProject = async ({ name }: { name: string }) => {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

  const id = await saveProject({ name, ownerId: session.user.id });
  return { success: true, id };
};

export const deleteProject = async ({ id }: { id: string }) => {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

  await removeProject(id);
  return { success: true };
};

export const renameProject = async ({ id, name }: { id: string; name: string }) => {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

  await updateProjectName(id, name);
  return { success: true };
};
