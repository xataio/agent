import { DataStreamWriter, LanguageModel, Tool } from 'ai';
import { Pool } from 'pg';
import { getUserDBAccess } from '~/lib/db/db';
import { Connection, Project } from '~/lib/db/schema';
import { artifactsPrompt } from './prompts';
import { getLanguageModel } from './providers';
import { commonToolset, getDBClusterTools, getDBSQLTools, getPlaybookTools, mergeToolsets } from './tools';
import { getArtifactTools } from './tools/artifacts';

const commonSystemPrompt = `
You are an AI assistant expert in PostgreSQL and database administration.
Your name is Xata Agent.
Always answer SUCCINCTLY and to the point.
Be CONCISE.
If the user asks for something that is not related to PostgreSQL or database administration, tell them that you are not able to help with that.
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

export function getChatSystemPrompt({
  project,
  useArtifacts = false
}: {
  project: Project;
  useArtifacts?: boolean;
}): string {
  return [chatSystemPrompt, getCloudProviderPrompt(project.cloudProvider), useArtifacts ? artifactsPrompt : '']
    .filter(Boolean)
    .join('\n');
}

export async function getTools({
  project,
  connection,
  targetDb,
  userId,
  useArtifacts = false,
  dataStream
}: {
  project: Project;
  connection: Connection;
  targetDb: Pool;
  userId: string;
  useArtifacts?: boolean;
  dataStream?: DataStreamWriter;
}): Promise<Record<string, Tool>> {
  const dbAccess = await getUserDBAccess(userId);

  const dbTools = getDBSQLTools(targetDb);
  const clusterTools = getDBClusterTools(dbAccess, connection, project.cloudProvider);
  const playbookToolset = getPlaybookTools(dbAccess, project.id);
  const artifactsToolset =
    useArtifacts && dataStream ? getArtifactTools({ dbAccess, userId, projectId: project.id, dataStream }) : {};

  return mergeToolsets(commonToolset, playbookToolset, dbTools, clusterTools, artifactsToolset);
}

export function getModelInstance(name: string): LanguageModel {
  const model = getLanguageModel(name);
  return model.instance();
}
