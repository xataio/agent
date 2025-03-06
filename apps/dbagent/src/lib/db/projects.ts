'use server';

import { and, eq } from 'drizzle-orm';
import { queryDb } from './db';
import { projectMembers, projects } from './schema';

export type Project = {
  id: string;
  name: string;
};

export async function createProject(project: Omit<Project, 'id'>): Promise<string> {
  return await queryDb(async ({ db, userId }) => {
    // Create the project
    const result = await db
      .insert(projects)
      .values({
        name: project.name
      })
      .returning({ id: projects.id });

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
  return await queryDb(async ({ db, userId }) => {
    // Get project where user is a member
    const results = await db
      .select({
        id: projects.id,
        name: projects.name
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
      .where(and(eq(projects.id, id), eq(projectMembers.userId, userId)));

    return results[0] ?? null;
  });
}

export async function listProjects(): Promise<Project[]> {
  return await queryDb(async ({ db, userId }) => {
    // Get all projects where user is a member
    const results = await db
      .select({
        id: projects.id,
        name: projects.name
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.userId, userId));

    return results;
  });
}

export async function deleteProject({ id }: { id: string }): Promise<void> {
  await queryDb(async ({ db, userId }) => {
    // Verify the user is an owner of this project
    const member = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(
        and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId), eq(projectMembers.role, 'owner'))
      );

    if (!member[0]) {
      throw new Error('Not authorized to delete this project');
    }

    // Delete the project (cascade should handle the members)
    await db.delete(projects).where(eq(projects.id, id));
  });
}

export async function updateProject(id: string, update: Partial<Omit<Project, 'id'>>): Promise<void> {
  return await queryDb(async ({ db, userId }) => {
    // Verify the user is an owner of this project
    const member = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(
        and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId), eq(projectMembers.role, 'owner'))
      );

    if (!member[0]) {
      throw new Error('Not authorized to update this project');
    }

    // Update the project
    await db.update(projects).set(update).where(eq(projects.id, id));
  });
}
