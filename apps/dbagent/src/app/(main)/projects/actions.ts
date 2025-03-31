'use server';

import { getUserSessionDBAccess } from '~/lib/db/db';
import { listProjects } from '~/lib/db/projects';

export async function getProjectsList() {
  const db = await getUserSessionDBAccess();
  return listProjects(db);
}
