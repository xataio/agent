import { LanguageModel } from 'ai';
import { CloudProvider } from '../db/schema';
import { artifactsPrompt, chatSystemPrompt, commonSystemPrompt, monitoringSystemPrompt } from './prompts';
import { getLanguageModel } from './providers';

function getCloudProviderPrompt(cloudProvider: string): string {
  switch (cloudProvider) {
    case 'aws':
      return `All Postgres instances in this project are hosted on AWS, either RDS or Aurora. 
      When recommending actions, only recommend actions that can be performed on RDS or Aurora.
      If you need to know more about the instance, you can use the getClusterInfo tool.
      If you want to recommend changes to the instance, provide instructions specific to RDS or Aurora.
      `;
    case 'gcp':
      return `All Postgres instances in this project are GCP Cloud SQL instances.
      When recommending actions, only recommend actions that can be performed on GCP Cloud SQL.
      If you need to know more about the instance, you can use the getInstanceInfo tool.
      If you want to recommend changes to the instance, provide instructions specific to GCP Cloud SQL.
      `;
    default:
      return '';
  }
}

export function getChatSystemPrompt({
  cloudProvider,
  useArtifacts = false
}: {
  cloudProvider: CloudProvider;
  useArtifacts?: boolean;
}): string {
  return [
    commonSystemPrompt,
    chatSystemPrompt,
    getCloudProviderPrompt(cloudProvider),
    useArtifacts ? artifactsPrompt : ''
  ]
    .filter((item) => item?.trim().length > 0)
    .join('\n');
}

export function getMonitoringSystemPrompt({ cloudProvider }: { cloudProvider: CloudProvider }): string {
  return [commonSystemPrompt, monitoringSystemPrompt, getCloudProviderPrompt(cloudProvider)]
    .filter((item) => item?.trim().length > 0)
    .join('\n');
}

export function getModelInstance(name: string): LanguageModel {
  const model = getLanguageModel(name);
  return model.instance();
}
