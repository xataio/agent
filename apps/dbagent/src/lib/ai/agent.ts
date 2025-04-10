import { LanguageModel } from 'ai';
import { CloudProvider } from '../db/schema';
import { chatSystemPrompt, commonSystemPrompt, monitoringSystemPrompt } from './prompts';
import { getLanguageModel } from './providers';

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

export function getChatSystemPrompt({ cloudProvider }: { cloudProvider: CloudProvider }): string {
  return [commonSystemPrompt, chatSystemPrompt, getCloudProviderPrompt(cloudProvider)]
    .filter((item) => item?.trim().length > 0)
    .join('\n');
}

export function getMonitoringSystemPrompt({ cloudProvider }: { cloudProvider: CloudProvider }): string {
  return [commonSystemPrompt, monitoringSystemPrompt, getCloudProviderPrompt(cloudProvider)]
    .filter((item) => item?.trim().length > 0)
    .join('\n');
}

export async function getModelInstance(name: string): Promise<LanguageModel> {
  const model = await getLanguageModel(name);
  return model.instance();
}
