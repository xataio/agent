'use server';

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

import { and, eq } from 'drizzle-orm';
import { queryDb } from '~/lib/db/db';
import { playbooks } from '~/lib/db/schema';
import { getBuiltInPlaybooks, Playbook } from '~/lib/tools/playbooks';

export interface customPlaybook {
  name: string;
  description: string;
  content: string;
  id: string;
  projectId: string;
  isBuiltIn: boolean;
}

//playbook db get
export async function actionGetCustomPlaybooks(projectId?: string) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const customPlaybooks = await queryDb(async ({ db }) => {
    const results = await db.select().from(playbooks).where(eq(playbooks.projectId, projectId));
    return results.map((playbook) => ({
      name: playbook.name,
      description: playbook.description || '',
      content: playbook.content as string,
      id: playbook.id,
      projectId: playbook.projectId,
      isBuiltIn: false
    }));
  });

  //console ouput for testing custom playbooks
  console.log('Loaded playbooks:', {
    // builtIn: builtInPlaybooks,
    custom: customPlaybooks
  });

  return customPlaybooks;
}

//not used anywhere but in this file
export async function actionGetBuiltInPlaybooks() {
  return getBuiltInPlaybooks();
}

//not used anywhere but in this file
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
export async function actionCreatePlaybook(input: customPlaybook): Promise<Playbook> {
  console.log('Creating playbook', input);

  return await queryDb(async ({ db, userId }) => {
    // Check if playbook with same name exists in the project
    const existingPlaybook = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.name, input.name), eq(playbooks.projectId, input.projectId)))
      .limit(1);

    if (existingPlaybook.length > 0) {
      throw new Error('A playbook with this name already exists in this project');
    }

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

export async function actionDeletePlaybook(id: string): Promise<void> {
  return await queryDb(async ({ db }) => {
    await db.delete(playbooks).where(eq(playbooks.id, id));
  });
}

export async function actionGeneratePlaybookContent(name: string, description: string): Promise<string> {
  const prompt = `Generate a detailed playbook content for a database task with the following details:
                  Name: ${name}
                  Description: ${description}

                  The playbook should:
                  1. Be written in clear, step-by-step instructions
                  2. Include specific SQL commands where needed
                  3. Follow best practices for database operations
                  4. Include error handling considerations
                  5. Be formatted in a way that's easy for an AI agent to follow

                  Please generate the playbook content:`;

  const { text } = await generateText({
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: 'You are a database expert who creates detailed, step-by-step playbooks for database operations.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    //lower values for temperature and topP are more deterministic higher are more creative(max 2.0)
    //0.1 is deterministic, 0.7 is creative
    temperature: 0.2,
    topP: 0.1,
    maxTokens: 1000
  });

  return text.trim() || 'Failed to generate playbook content';
}
