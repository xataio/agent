import { dbGetCustomPlaybooks } from '../db/custom-playbooks';
import { getPlaybook, listPlaybooks } from './playbooks';
export interface customPlaybook {
  name: string;
  description: string;
  content: string;
  id: string;
  projectId: string;
  isBuiltIn: boolean;
  createdBy: string;
}

//get a list of custom playbooks using projectId
export async function getCustomPlaybooks(projectId: string, asUserId?: string): Promise<customPlaybook[]> {
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
export async function getCustomPlaybook(projectId: string, id: string, asUserId?: string): Promise<customPlaybook> {
  const customPlaybooks = await getCustomPlaybooks(projectId, asUserId);
  const customPlaybook = customPlaybooks.find((playbook) => playbook.id === id);
  if (!customPlaybook) {
    throw new Error('Custom playbook not found');
  }
  return customPlaybook;
}

//get a custom playbook by name
export async function getCustomPlaybookByName(
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
    const customPlaybooks = await getCustomPlaybooks(projectId, asUserId);
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

//get a list of custom playbooks names
export async function getListOfCustomPlaybooksNames(projectId: string, asUserId?: string): Promise<string[] | null> {
  try {
    const customPlaybooks = await getCustomPlaybooks(projectId, asUserId);
    const customPlaybooksNames = customPlaybooks.map((playbook) => playbook.name);
    return customPlaybooksNames.length === 0 ? null : customPlaybooksNames;
  } catch (error) {
    console.error('Error in getListOfCustomPlaybooksNames:', error);
    throw new Error('Failed to get list of custom playbooks names');
  }
}

//get a custom playbook content by name
export async function getCustomPlaybookContent(
  projectId: string,
  name: string,
  asUserId?: string
): Promise<string | null> {
  try {
    const playbookWithDesc = await getCustomPlaybookByName(projectId, name, asUserId);
    return playbookWithDesc?.content ?? null;
  } catch (error) {
    console.error('Error in getCustomPlaybookContent:', error);
    throw new Error('Failed to get custom playbook content');
  }
}

//gets content for either a custom playbook or a built in playbook
export async function getCustomPlaybookAndPlaybookTool(
  name: string,
  connProjectId: string,
  asUserId?: string,
  asProjectId?: string
): Promise<string> {
  const playBookContent = getPlaybook(name);
  //im not sure this is needed as asProjectId and connProjectId might be the same when ran in runners.ts
  const projectId = asProjectId || connProjectId;
  const customPlaybookContent = await getCustomPlaybookContent(projectId, name, asUserId);

  return customPlaybookContent !== null ? customPlaybookContent : playBookContent;
}

//gets a list of custom playbooks and built in playbooks
export async function listCustomPlaybooksAndPlaybookTool(
  connProjectId: string,
  asUserId?: string,
  asProjectId?: string
): Promise<string[]> {
  const playbookNames = listPlaybooks();
  const projectId = asProjectId || connProjectId;
  const customPlaybookNames = await getListOfCustomPlaybooksNames(projectId, asUserId);

  return customPlaybookNames !== null ? [...playbookNames, ...customPlaybookNames] : playbookNames;
}
