import { LanguageModel, Tool } from 'ai';
import { Pool } from 'pg';
import { Connection } from '~/lib/db/connections';
import { getUserDBAccess } from '~/lib/db/db';
import { Project } from '../db/projects';
import { chatSystemPrompt, commonSystemPrompt, monitoringSystemPrompt } from './prompts';
import { getLanguageModel } from './providers';
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

export function getModelInstance(name: string): LanguageModel {
  const model = getLanguageModel(name);
  return model.instance();
}
