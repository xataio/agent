'use server';

import { eq } from 'drizzle-orm';
import { queryDb } from './db';
import { projectMembers, projects } from './schema';

export type Project = {
  id: string;
  name: string;
};

export async function generateProjectId(): Promise<string> {
  return crypto.randomUUID();
}

export async function createProject(project: Omit<Project, 'id'>): Promise<string> {
  const projectId = await generateProjectId();
  return await queryDb(async ({ db, userId }) => {
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

export async function getProjectByName(name: string, asUserId?: string): Promise<Project | null> {
  return await queryDb(
    async ({ db }) => {
      const results = await db.select().from(projects).where(eq(projects.name, name));
      return results[0] ?? null;
    },
    {
      asUserId: asUserId
    }
  );
}

export async function getProjectById(id: string, asUserId?: string): Promise<Project | null> {
  return await queryDb(
    async ({ db }) => {
      const results = await db.select().from(projects).where(eq(projects.id, id));
      return results[0] ?? null;
    },
    {
      asUserId: asUserId
    }
  );
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
