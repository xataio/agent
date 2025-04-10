import { dbGetCustomPlaybooks } from '../db/custom-playbooks';
import { DBAccess } from '../db/db';
import { getPlaybook, listPlaybooks } from './playbooks';

export interface CustomPlaybook {
  name: string;
  description: string;
  content: string;
  id: string;
  projectId: string;
  isBuiltIn: boolean;
  createdBy: string;
}

//get a list of custom playbooks using projectId
export async function getCustomPlaybooks(dbAccess: DBAccess, projectId: string): Promise<CustomPlaybook[]> {
  if (!projectId) {
    throw new Error('[INVALID_INPUT] Project ID is required');
  }
  try {
    return await dbGetCustomPlaybooks(dbAccess, projectId);
  } catch (error) {
    console.error('Error in actionGetCustomPlaybooks:', error);
    throw new Error('Failed to get custom playbooks');
  }
}

//get a custom playbook by id
export async function getCustomPlaybook(dbAccess: DBAccess, projectId: string, id: string): Promise<CustomPlaybook> {
  const customPlaybooks = await getCustomPlaybooks(dbAccess, projectId);
  const customPlaybook = customPlaybooks.find((playbook) => playbook.id === id);
  if (!customPlaybook) {
    throw new Error('Custom playbook not found');
  }
  return customPlaybook;
}

//get a custom playbook by name
export async function getCustomPlaybookByName(
  dbAccess: DBAccess,
  projectId: string,
  name: string
): Promise<CustomPlaybook | null> {
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  if (!name) {
    throw new Error('Playbook Name is required');
  }

  try {
    const customPlaybooks = await getCustomPlaybooks(dbAccess, projectId);
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
export async function getListOfCustomPlaybooksNames(dbAccess: DBAccess, projectId: string): Promise<string[] | null> {
  try {
    const customPlaybooks = await getCustomPlaybooks(dbAccess, projectId);
    const customPlaybooksNames = customPlaybooks.map((playbook) => playbook.name);
    return customPlaybooksNames.length === 0 ? null : customPlaybooksNames;
  } catch (error) {
    console.error('Error in getListOfCustomPlaybooksNames:', error);
    throw new Error('Failed to get list of custom playbooks names');
  }
}

//get a custom playbook content by name
export async function getCustomPlaybookContent(
  dbAccess: DBAccess,
  projectId: string,
  name: string
): Promise<string | null> {
  try {
    const playbookWithDesc = await getCustomPlaybookByName(dbAccess, projectId, name);
    return playbookWithDesc?.content ?? null;
  } catch (error) {
    console.error('Error in getCustomPlaybookContent:', error);
    throw new Error('Failed to get custom playbook content');
  }
}

//gets content for either a custom playbook or a built in playbook
export async function getCustomPlaybookAndPlaybookTool(db: DBAccess, name: string, projectId: string): Promise<string> {
  const playBookContent = getPlaybook(name);
  const customPlaybookContent = await getCustomPlaybookContent(db, projectId, name);
  return customPlaybookContent !== null ? customPlaybookContent : playBookContent;
}

//gets a list of custom playbooks and built in playbooks
export async function listCustomPlaybooksAndPlaybookTool(dbAccess: DBAccess, projectId: string): Promise<string[]> {
  const playbookNames = listPlaybooks();
  const customPlaybookNames = await getListOfCustomPlaybooksNames(dbAccess, projectId);

  return customPlaybookNames !== null ? [...playbookNames, ...customPlaybookNames] : playbookNames;
}
