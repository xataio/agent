import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { LanguageModelV1, Tool } from 'ai';
import { Pool } from 'pg';
import { getUserDBAccess } from '~/lib/db/db';
import { Connection, Project } from '~/lib/db/schema';
import { commonToolset, getDBClusterTools, getDBSQLTools, getPlaybookToolset, mergeToolsets } from './tools';

const commonSystemPrompt = `
You are an AI assistant expert in PostgreSQL and database administration.
Your name is Xata Agent.
Always answer SUCCINCTLY and to the point.
Be CONCISE.
`;

const chatSystemPrompt = `${commonSystemPrompt}
Provide clear, concise, and accurate responses to questions.
Use the provided tools to get context from the PostgreSQL database to answer questions.
When asked why a query is slow, call the explainQuery tool and also take into account the table sizes.
During the initial assessment use the getTablesAndInstanceInfo, getPerfromanceAndVacuumSettings,
and getPostgresExtensions tools.
When asked to run a playbook, use the getPlaybook tool to get the playbook contents. Then use the contents of the playbook
as an action plan. Execute the plan step by step.
`;

const monitoringSystemPrompt = `${commonSystemPrompt}
You are now executing a periodic monitoring task.
You are provided with a playbook name and a set of tools that you can use to execute the playbook.
First thing you need to do is call the getPlaybook tool to get the playbook contents.
Then use the contents of the playbook as an action plan. Execute the plan step by step.
At the end of your execution, print a summary of the results.
`;

export function getMonitoringSystemPrompt(project: Project): string {
  switch (project.cloudProvider) {
    case 'aws':
      return monitoringSystemPrompt + `All instances in this project are AWS instances.`;
    case 'gcp':
      return monitoringSystemPrompt + `All instances in this project are GCP Cloud SQL instances.`;
    default:
      return monitoringSystemPrompt;
  }
}

export function getChatSystemPrompt(project: Project): string {
  switch (project.cloudProvider) {
    case 'aws':
      return chatSystemPrompt + `All instances in this project are AWS instances.`;
    case 'gcp':
      return chatSystemPrompt + `All instances in this project are GCP Cloud SQL instances.`;
    default:
      return chatSystemPrompt;
  }
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
