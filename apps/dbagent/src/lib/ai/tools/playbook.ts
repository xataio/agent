import { tool } from 'ai';
import { z } from 'zod';
import { getPlaybook, listPlaybooks } from '~/lib/tools/playbooks';

export const getPlaybookTool = tool({
  description: `Get a playbook contents by name. A playbook is a list of steps to follow to achieve a goal. Follow it step by step.`,
  parameters: z.object({
    name: z.string()
  }),
  execute: async ({ name }: { name: string }) => getPlaybook(name)
});

export const listPlaybooksTool = tool({
  description: `List the available playbooks.`,
  parameters: z.object({}),
  execute: async () => listPlaybooks()
});

// The playbookToolset provides agent tools for accessing available playbooks.
export const playbookToolset = {
  getPlaybookTool,
  listPlaybooksTool
};
