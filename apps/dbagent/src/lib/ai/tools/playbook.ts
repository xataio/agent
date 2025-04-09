import { tool, Tool } from 'ai';
import { z } from 'zod';
import { getCustomPlaybookAndPlaybookTool, listCustomPlaybooksAndPlaybookTool } from '~/lib/tools/custom-playbooks';
import { ToolsetGroup } from './types';

export function getPlaybookToolset(
  connProjectId: string,
  asUserId?: string,
  asProjectId?: string
): Record<string, Tool> {
  return new playbookTools(() => Promise.resolve({ connProjectId, asUserId, asProjectId })).toolset();
}

export class playbookTools implements ToolsetGroup {
  private _connProjectId: () => Promise<{ connProjectId: string; asUserId?: string; asProjectId?: string }>;

  constructor(getter: () => Promise<{ connProjectId: string; asUserId?: string; asProjectId?: string }>) {
    this._connProjectId = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getPlaybookTool: this.getPlaybookTool(),
      listPlaybooksTool: this.listPlaybooksTool()
    };
  }

  private getPlaybookTool(): Tool {
    const getter = this._connProjectId;
    return tool({
      description: `Get a playbook contents by name. A playbook is a list of steps to follow to achieve a goal. Follow it step by step.`,
      parameters: z.object({
        name: z.string()
      }),
      execute: async ({ name }: { name: string }) => {
        const { connProjectId, asUserId, asProjectId } = await getter();
        return await getCustomPlaybookAndPlaybookTool(name, connProjectId, asUserId, asProjectId);
      }
    });
  }

  private listPlaybooksTool(): Tool {
    const getter = this._connProjectId;
    return tool({
      description: `List the available playbooks.`,
      parameters: z.object({}),
      execute: async () => {
        const { connProjectId, asUserId, asProjectId } = await getter();
        return await listCustomPlaybooksAndPlaybookTool(connProjectId, asUserId, asProjectId);
      }
    });
  }
}
