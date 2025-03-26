'use server';

import { queryDb } from '~/lib/db/db';
import { playbooks } from '~/lib/db/schema';
import { getBuiltInPlaybooks, Playbook } from '~/lib/tools/playbooks';

export interface PlaybookInput {
  name: string;
  description: string;
  content: string;
  id: string;
  projectId: string;
  isBuiltIn: boolean;
}

//playbook db get
export async function actionGetCustomPlaybooks(_projectId?: string) {
  // const builtInPlaybooks = getBuiltInPlaybooks();

  const customPlaybooks = await queryDb(async ({ db }) => {
    const results = await db.select().from(playbooks);
    return results.map((playbook) => ({
      name: playbook.name,
      description: playbook.description || '',
      content: playbook.content as string,
      id: playbook.id,
      projectId: playbook.projectId,
      isBuiltIn: false
    }));
  });

  console.log('Loaded playbooks:', {
    // builtIn: builtInPlaybooks,
    custom: customPlaybooks
  });

  return customPlaybooks;
}

export async function actionGetBuiltInPlaybooks() {
  return getBuiltInPlaybooks();
}

//edit this to work with projectId in the future
export async function actionGetPlaybookByName(name: string, _projectId?: string) {
  // First check built-in playbooks
  const builtInPlaybook = getBuiltInPlaybooks().find((p) => p.name === name);
  if (builtInPlaybook) {
    return builtInPlaybook;
  }

  // In a real implementation, we would check a database for custom playbooks
  return null;
}

//playbook db insert
export async function actionCreatePlaybook(input: PlaybookInput): Promise<Playbook> {
  console.log('Creating playbook', input);

  return await queryDb(async ({ db, userId }) => {
    const result = await db
      .insert(playbooks)
      .values({
        id: input.id,
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        content: input.content,
        createdBy: userId
      })
      .returning();

    const playbook = result[0];

    if (!playbook) {
      throw new Error('Failed to create playbook');
    }

    return {
      name: playbook.name,
      description: playbook.description || '',
      content: playbook.content as string,
      isBuiltIn: false
    };
  });
}

export async function actionUpdatePlaybook(
  name: string,
  input: { description?: string; content?: string }
): Promise<Playbook | null> {
  // In a real implementation, this would update a record in the database

  // For now, return a mock result
  return {
    name,
    description: input.description || '',
    content: input.content || '',
    isBuiltIn: false
  };
}

export async function actionDeletePlaybook(_projectId?: string): Promise<void> {
  // In a real implementation, this would delete a record from the database

  // For now, just return a promise that resolves
  return Promise.resolve();
}
