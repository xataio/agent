import { tool, Tool } from 'ai';
import { z } from 'zod';
import { DBAccess } from '~/lib/db/db';
import { getCustomPlaybookAndPlaybookTool, listCustomPlaybooksAndPlaybookTool } from '~/lib/tools/custom-playbooks';
import { getPlaybook, listPlaybooks } from '~/lib/tools/playbooks';

export interface PlaybookService {
  fetch(name: string): Promise<string>;
  list(): Promise<string[]>;
}

export function getPlaybookToolset(tools?: PlaybookService): Record<string, Tool> {
  if (!tools) {
    return builtinPlaybookToolset;
  }
  return {
    fetch: playbookFetchTool(async (name: string) => tools.fetch(name)),
    list: playbookListTool(async () => tools.list())
  };
}

export const builtinPlaybookToolset = {
  getPlaybookTool: playbookFetchTool(async (name: string) => getPlaybook(name)),
  listPlaybooksTool: playbookListTool(async () => listPlaybooks())
};

export function projectPlaybookService(
  dbAccess: DBAccess,
  connProjectId: string | (() => Promise<{ projectId: string }>)
): PlaybookService {
  const getter = typeof connProjectId === 'string' ? async () => ({ projectId: connProjectId }) : connProjectId;
  return {
    fetch: async (name: string): Promise<string> => {
      const { projectId } = await getter();
      return await getCustomPlaybookAndPlaybookTool(dbAccess, name, projectId);
    },
    list: async (): Promise<string[]> => {
      const { projectId } = await getter();
      return await listCustomPlaybooksAndPlaybookTool(dbAccess, projectId);
    }
  };
}

function playbookFetchTool(execute: (name: string) => Promise<string>): Tool {
  return tool({
    description: `Get a playbook contents by name. A playbook is a list of steps to follow to achieve a goal. Follow it step by step.`,
    parameters: z.object({
      name: z.string()
    }),
    execute: async ({ name }: { name: string }) => execute(name)
  });
}

function playbookListTool(execute: () => Promise<string[]>): Tool {
  return tool({
    description: `List the available playbooks.`,
    parameters: z.object({}),
    execute: async () => execute()
  });
}
