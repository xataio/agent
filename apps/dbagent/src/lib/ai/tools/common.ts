import { tool } from 'ai';
import { z } from 'zod';

export const getCurrentTime = tool({
  description: 'Get the current time',
  parameters: z.object({}),
  execute: async () => {
    const now = new Date();
    return now.toLocaleTimeString();
  }
});

export const commonToolset = {
  getCurrentTime
};
