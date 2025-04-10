import { LanguageModel } from 'ai';
import { Project } from '../db/schema';
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

export function getChatSystemPrompt({ project }: { project: Project }): string {
  return [commonSystemPrompt, chatSystemPrompt, getCloudProviderPrompt(project.cloudProvider)]
    .filter((item) => item?.trim().length > 0)
    .join('\n');
}

export function getMonitoringSystemPrompt({ project }: { project: Project }): string {
  return [commonSystemPrompt, monitoringSystemPrompt, getCloudProviderPrompt(project.cloudProvider)]
    .filter((item) => item?.trim().length > 0)
    .join('\n');
}

export function getModelInstance(name: string): LanguageModel {
  const model = getLanguageModel(name);
  return model.instance();
}
