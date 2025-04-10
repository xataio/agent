import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { LanguageModelV1, Tool } from 'ai';
import { Pool } from 'pg';
import { Connection } from '~/lib/db/connections';
import { getUserDBAccess } from '~/lib/db/db';
import { Project } from '../db/projects';
import { chatSystemPrompt, commonSystemPrompt, monitoringSystemPrompt } from './prompts';
import { commonToolset, getDBClusterTools, getDBSQLTools, getPlaybookToolset, mergeToolsets } from './tools';

function getCloudProviderPrompt(cloudProvider: string): string {
  switch (cloudProvider) {
    case 'aws':
      return `All instances in this project are AWS instances.`;
    case 'gcp':
      return `All instances in this project are GCP Cloud SQL instances.`;
    default:
      return '';
  }
}

export function getChatSystemPrompt({ project }: { project: Project }): string {
  return [commonSystemPrompt, chatSystemPrompt, getCloudProviderPrompt(project.cloudProvider)]
    .filter((item) => item?.trim().length > 0)
    .join('\n');
}

export function getMonitoringSystemPrompt(project: Project): string {
  return [commonSystemPrompt, monitoringSystemPrompt, getCloudProviderPrompt(project.cloudProvider)]
    .filter((item) => item?.trim().length > 0)
    .join('\n');
}

export async function getTools(
  project: Project,
  connection: Connection,
  targetDb: Pool,
  asUserId?: string
): Promise<Record<string, Tool>> {
  const dbAccess = await getUserDBAccess(asUserId);

  const dbTools = getDBSQLTools(targetDb);
  const clusterTools = getDBClusterTools(dbAccess, connection, project.cloudProvider);
  const playbookToolset = getPlaybookToolset(dbAccess, project.id);
  return mergeToolsets(commonToolset, playbookToolset, dbTools, clusterTools);
}

export function getModelInstance(model: string): LanguageModelV1 {
  if (model.startsWith('openai-')) {
    return openai(model.replace('openai-', ''));
  } else if (model.startsWith('deepseek-')) {
    return deepseek(model);
  } else if (model.startsWith('anthropic-')) {
    return anthropic(model.replace('anthropic-', ''));
  } else if (model.startsWith('gemini-')) {
    return google(model);
  } else {
    throw new Error('Invalid model');
  }
}
