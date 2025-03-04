import { eq } from 'drizzle-orm';
import { db } from './db';
import { projects } from './schema';

export type Project = {
  id: string;
  name: string;
  ownerId: string;
};

export async function saveProject(cluster: Omit<Project, 'id'>): Promise<string> {
  const result = await db.insert(projects).values(cluster).returning({ id: projects.id });

  if (!result[0]) {
    throw new Error('Failed to save cluster');
  }

  return result[0].id;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const results = await db.select().from(projects).where(eq(projects.id, id));
  return results[0] || null;
}

export async function getProjects(): Promise<Project[]> {
  return await db.select().from(projects);
}
