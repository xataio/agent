'use server';

import { eq } from 'drizzle-orm';
import { queryDb } from './db';
import { projectMembers, projects } from './schema';

export type Project = {
  id: string;
  name: string;
};

export async function createProject(project: Omit<Project, 'id'>): Promise<string> {
  return await queryDb(async ({ db, userId }) => {
    // Create the project
    const result = await db.insert(projects).values(project).returning({ id: projects.id });

    if (!result[0]) {
      throw new Error('Failed to create project');
    }

    // Create the project member relationship with owner role
    await db.insert(projectMembers).values({
      projectId: result[0].id,
      userId: userId,
      role: 'owner'
    });

    return result[0].id;
  });
}

export async function getProjectById(id: string): Promise<Project | null> {
  return await queryDb(async ({ db }) => {
    const results = await db.select().from(projects).where(eq(projects.id, id));

    return results[0] ?? null;
  });
}

export async function listProjects(): Promise<Project[]> {
  return await queryDb(async ({ db }) => {
    return await db.select().from(projects);
  });
}

export async function deleteProject({ id }: { id: string }): Promise<void> {
  await queryDb(async ({ db }) => {
    await db.delete(projects).where(eq(projects.id, id));
  });
}

export async function updateProject(id: string, update: Partial<Omit<Project, 'id'>>): Promise<void> {
  return await queryDb(async ({ db }) => {
    await db.update(projects).set(update).where(eq(projects.id, id));
  });
}
