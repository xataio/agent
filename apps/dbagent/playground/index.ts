import { Mastra } from '@mastra/core';
import { createAgents } from './default';

export const mastra = new Mastra({
  agents: createAgents()
});
