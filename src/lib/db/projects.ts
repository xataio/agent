'use server';

import { eq } from 'drizzle-orm';
import { generateUUID } from '~/components/chat/utils';
import { DBAccess } from './db';
import { Project, ProjectInsert, projectMembers, projects } from './schema';

export async function generateProjectId(): Promise<string> {
  return generateUUID();
}

export async function createProject(dbAccess: DBAccess, project: ProjectInsert): Promise<string> {
  const projectId = await generateProjectId();
  return await dbAccess.query(async ({ db, userId }) => {
    // Create the project
    await db.insert(projects).values({ ...project, id: projectId });

    // Create the project member relationship with owner role
    await db.insert(projectMembers).values({
      projectId: projectId,
      userId: userId,
      role: 'owner'
    });

    return projectId;
  });
}

export async function getProjectByName(dbAccess: DBAccess, name: string): Promise<Project | null> {
  return await dbAccess.query(async ({ db }) => {
    const results = await db.select().from(projects).where(eq(projects.name, name));
    return results[0] ?? null;
  });
}

export async function getProjectById(dbAccess: DBAccess, id: string): Promise<Project | null> {
  return await dbAccess.query(async ({ db }) => {
    const results = await db.select().from(projects).where(eq(projects.id, id));
    return results[0] ?? null;
  });
}

export async function listProjects(dbAccess: DBAccess): Promise<Project[]> {
  return await dbAccess.query(async ({ db }) => {
    return await db.select().from(projects);
  });
}

export async function deleteProject(dbAccess: DBAccess, { id }: { id: string }): Promise<void> {
  await dbAccess.query(async ({ db }) => {
    await db.delete(projects).where(eq(projects.id, id));
  });
}

export async function updateProject(
  dbAccess: DBAccess,
  id: string,
  update: Partial<Omit<Project, 'id'>>
): Promise<void> {
  return await dbAccess.query(async ({ db }) => {
    await db.update(projects).set(update).where(eq(projects.id, id));
  });
}
