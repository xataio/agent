'use server';

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

import { dbCreatePlaybook, dbDeletePlaybook, dbUpdatePlaybook } from '~/lib/db/custom-playbooks';
import {
  customPlaybook,
  getCustomPlaybook,
  getCustomPlaybookByName,
  getCustomPlaybookContent,
  getCustomPlaybooks,
  getListOfCustomPlaybooksNames
} from '~/lib/tools/custom-playbooks';
import { Playbook } from '~/lib/tools/playbooks';

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

  try {
    return text.trim();
  } catch (error) {
    console.error('Error in actionGeneratePlaybookContent:', error);
    throw new Error('Failed to generate playbook content');
  }
}

//playbook db get
export async function actionGetCustomPlaybooks(projectId: string, asUserId?: string): Promise<customPlaybook[]> {
  return getCustomPlaybooks(projectId, asUserId);
}

//get a custom playbook by id
export async function actionGetCustomPlaybook(
  projectId: string,
  id: string,
  asUserId?: string
): Promise<customPlaybook> {
  return getCustomPlaybook(projectId, id, asUserId);
}

//get a custom playbook by Name (used in scheduler since names are given though getPlaybook)
export async function actionGetCustomPlaybookByName(
  projectId: string,
  name: string,
  asUserId?: string
): Promise<customPlaybook | null> {
  return getCustomPlaybookByName(projectId, name, asUserId);
}

//get a list of custom playbook names
export async function actionListCustomPlaybooksNames(projectId: string, asUserId?: string): Promise<string[] | null> {
  return getListOfCustomPlaybooksNames(projectId, asUserId);
}

//get a custom playbook content by name
export async function actionGetCustomPlaybookContent(
  projectId: string,
  name: string,
  asUserId?: string
): Promise<string | null> {
  return getCustomPlaybookContent(projectId, name, asUserId);
}

//playbook db insert
export async function actionCreatePlaybook(input: customPlaybook): Promise<Playbook> {
  console.log('Creating playbook {input: ', input, '}');
  return await dbCreatePlaybook(input);
}

//playbook db update
export async function actionUpdatePlaybook(
  id: string,
  input: { description?: string; content?: string }
): Promise<Playbook | null> {
  console.log('Updating playbook {id: ', id, '} with {input: ', input, '}');
  return await dbUpdatePlaybook(id, input);
}

//playbook db delete
export async function actionDeletePlaybook(id: string): Promise<void> {
  console.log('Deleting playbook {id: ', id, '}');
  return await dbDeletePlaybook(id);
}
