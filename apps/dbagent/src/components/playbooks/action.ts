'use server';

import { generateText } from 'ai';
import { auth } from '~/auth';
import { getModelInstance } from '~/lib/ai/agent';

import { dbCreatePlaybook, dbDeletePlaybook, dbUpdatePlaybook } from '~/lib/db/custom-playbooks';
import { getUserDBAccess, getUserSessionDBAccess } from '~/lib/db/db';
import { getSchedulesByUserIdAndProjectId } from '~/lib/db/schedules';
import { Schedule } from '~/lib/db/schema';
import {
  CustomPlaybook,
  getCustomPlaybook,
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
    model: await getModelInstance('chat'),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        tags: ['playbook', 'generate']
      }
    },
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
export async function actionGetCustomPlaybooks(projectId: string, asUserId?: string): Promise<CustomPlaybook[]> {
  const dbAccess = await getUserDBAccess(asUserId);
  return getCustomPlaybooks(dbAccess, projectId);
}

//get a custom playbook by id
export async function actionGetCustomPlaybook(
  projectId: string,
  id: string,
  asUserId?: string
): Promise<CustomPlaybook> {
  const dbAccess = await getUserDBAccess(asUserId);
  return getCustomPlaybook(dbAccess, projectId, id);
}

//get a list of custom playbook names
export async function actionListCustomPlaybooksNames(projectId: string, asUserId?: string): Promise<string[] | null> {
  const dbAccess = await getUserDBAccess(asUserId);
  return getListOfCustomPlaybooksNames(dbAccess, projectId);
}

//playbook db insert
export async function actionCreatePlaybook(input: CustomPlaybook): Promise<Playbook> {
  const session = await auth();
  const userId = session?.user?.id ?? '';
  console.log('Creating playbook {input: ', input, '}');
  const dbAccess = await getUserSessionDBAccess();
  return await dbCreatePlaybook(dbAccess, { ...input, createdBy: userId });
}

//playbook db update
export async function actionUpdatePlaybook(
  id: string,
  input: { description?: string; content?: string }
): Promise<Playbook | null> {
  console.log('Updating playbook {id: ', id, '} with {input: ', input, '}');
  const dbAccess = await getUserSessionDBAccess();
  return await dbUpdatePlaybook(dbAccess, id, input);
}

//playbook db delete
export async function actionDeletePlaybook(id: string): Promise<void> {
  console.log('Deleting playbook {id: ', id, '}');
  const dbAccess = await getUserSessionDBAccess();
  return await dbDeletePlaybook(dbAccess, id);
}

export async function actionGetSchedulesByUserIdAndProjectId(userId: string, projectId: string): Promise<Schedule[]> {
  const dbAccess = await getUserDBAccess(userId);
  return await getSchedulesByUserIdAndProjectId(dbAccess, userId, projectId);
}
