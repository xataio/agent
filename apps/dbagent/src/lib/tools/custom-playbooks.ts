import { dbGetCustomPlaybooks } from '../db/custom-playbooks';

export interface customPlaybook {
  name: string;
  description: string;
  content: string;
  id: string;
  projectId: string;
  isBuiltIn: boolean;
}

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

export async function getCustomPlaybook(projectId: string, id: string, asUserId?: string): Promise<customPlaybook> {
  const customPlaybooks = await getCustomPlaybooks(projectId, asUserId);
  const customPlaybook = customPlaybooks.find((playbook) => playbook.id === id);
  if (!customPlaybook) {
    throw new Error('Custom playbook not found');
  }
  return customPlaybook;
}

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
