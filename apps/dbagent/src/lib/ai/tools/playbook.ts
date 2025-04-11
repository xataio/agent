import { tool, Tool } from 'ai';
import { z } from 'zod';
import { DBAccess } from '~/lib/db/db';
import { getCustomPlaybookAndPlaybookTool, listCustomPlaybooksAndPlaybookTool } from '~/lib/tools/custom-playbooks';
import { getPlaybook, listPlaybooks } from '~/lib/tools/playbooks';
import { ToolsetGroup } from './types';

export function getPlaybookToolset(dbAccess: DBAccess, projectId: string): Record<string, Tool> {
  return new playbookTools(dbAccess, () => Promise.resolve({ projectId })).toolset();
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

export const builtinPlaybookToolset = {
  getPlaybookTool: playbookFetchTool(async (name: string) => getPlaybook(name)),
  listPlaybooksTool: playbookListTool(async () => listPlaybooks())
};

export class playbookTools implements ToolsetGroup {
  #dbAccess: DBAccess;
  #connProjectId: () => Promise<{ projectId: string }>;

  constructor(dbAccess: DBAccess, getter: () => Promise<{ projectId: string }>) {
    this.#dbAccess = dbAccess;
    this.#connProjectId = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getPlaybookTool: this.getPlaybookTool(),
      listPlaybooksTool: this.listPlaybooksTool()
    };
  }

  private getPlaybookTool(): Tool {
    const db = this.#dbAccess;
    const getter = this.#connProjectId;
    return playbookFetchTool(async (name: string) => {
      const { projectId } = await getter();
      return await getCustomPlaybookAndPlaybookTool(db, name, projectId);
    });
  }

  private listPlaybooksTool(): Tool {
    const db = this.#dbAccess;
    const getter = this.#connProjectId;
    return playbookListTool(async () => {
      const { projectId } = await getter();
      return await listCustomPlaybooksAndPlaybookTool(db, projectId);
    });
  }
}
