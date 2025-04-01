'use server';

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { dbCreatePlaybook, dbDeletePlaybook, dbGetCustomPlaybooks, dbUpdatePlaybook } from '~/lib/db/custom-playbooks';
import { customPlaybook } from '~/lib/tools/custom-playbooks';
import { Playbook } from '~/lib/tools/playbooks';

//playbook db get
export async function actionGetCustomPlaybooks(projectId?: string, asUserId?: string) {
  if (!projectId) {
    throw new Error('[INVALID_INPUT] Project ID is required');
  }
  try {
    return await dbGetCustomPlaybooks(projectId, asUserId);
  } catch (error) {
    console.error('Error in actionGetCustomPlaybooks:', error);
    throw new Error('Failed to get custom playbooks');
  }
}

//get a custom playbook by id
export async function actionGetCustomPlaybook(projectId: string, id: string, asUserId?: string) {
  const customPlaybooks = await actionGetCustomPlaybooks(projectId, asUserId);
  const customPlaybook = customPlaybooks.find((playbook) => playbook.id === id);
  return customPlaybook;
}

//get a custom playbook by Name (used in scheduler since names are given though getPlaybook)
export async function actionGetCustomPlaybookByName(
  projectId: string,
  name: string,
  asUserId?: string
): Promise<customPlaybook | null> {
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  if (!name) {
    throw new Error('Playbook Name is required');
  }

  try {
    const customPlaybooks = await actionGetCustomPlaybooks(projectId, asUserId);
    const customPlaybook = customPlaybooks.find((playbook) => playbook.name === name);

    if (!customPlaybook) {
      return null;
    }

    return customPlaybook;
  } catch (error) {
    console.error('Error getting custom playbook:', error);
    throw new Error('Failed to get custom playbook');
  }
}

//get a list of custom playbook names
export async function actionListCustomPlaybooksNames(projectId: string, asUserId?: string): Promise<string[] | null> {
  const customPlaybooks = await actionGetCustomPlaybooks(projectId, asUserId);
  const customPlaybooksNames = customPlaybooks.map((playbook) => playbook.name);
  return customPlaybooksNames.length === 0 ? null : customPlaybooksNames;
}

//get a custom playbook content by name
export async function actionGetCustomPlaybookContent(
  projectId: string,
  name: string,
  asUserId?: string
): Promise<string | null> {
  const playbookWithDesc = await actionGetCustomPlaybookByName(projectId, name, asUserId);
  return playbookWithDesc?.content ?? null;
}

//playbook db insert
export async function actionCreatePlaybook(input: customPlaybook): Promise<Playbook> {
  console.log('Creating playbook', input);
  return await dbCreatePlaybook(input);
}

//playbook db update
export async function actionUpdatePlaybook(
  id: string,
  input: { description?: string; content?: string }
): Promise<Playbook | null> {
  return await dbUpdatePlaybook(id, input);
}

//playbook db delete
export async function actionDeletePlaybook(id: string): Promise<void> {
  return await dbDeletePlaybook(id);
}

//playbook content generation
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
