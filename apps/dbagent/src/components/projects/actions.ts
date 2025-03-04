'use server';

import { auth } from '~/auth';
import { saveProject } from '~/lib/db/projects';

export const createProject = async ({ name }: { name: string }) => {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

  const id = await saveProject({ name, ownerId: session.user.id });
  return { success: true, id };
};
