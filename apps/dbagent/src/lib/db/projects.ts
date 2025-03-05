'use server';
import { and, eq } from 'drizzle-orm';
// import 'server-only';
import { auth } from '~/auth';
import { db } from './db';
import { projects } from './schema';

export type Project = {
  id: string;
  name: string;
  ownerId: string;
};

export async function createProject(cluster: Omit<Project, 'id' | 'ownerId'>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const result = await db
    .insert(projects)
    .values({
      ...cluster,
      ownerId: session.user.id
    })
    .returning({ id: projects.id });

  if (!result[0]) {
    return { success: false, error: 'Failed to create project' };
  }

  return { success: true, id: result[0].id };
}

export async function getProjectById(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const results = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  return { success: true, project: results[0] };
}

export async function listProjects() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const result = await db.select().from(projects).where(eq(projects.ownerId, session.user.id));

  return { success: true, projects: result };
}

export async function deleteProject({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  return { success: true };
}

export async function updateProject(id: string, update: Partial<Omit<Project, 'id' | 'ownerId'>>) {
  const session = await auth();
  if (!session?.user?.id)
    return {
      success: false,
      error: 'Not authenticated'
    };

  await db
    .update(projects)
    .set(update)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  return { success: true };
}
