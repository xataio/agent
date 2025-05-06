import { LanguageModel } from 'ai';
import { CloudProvider } from '../db/schema';
import {
  artifactsPrompt,
  awsCloudProviderPrompt,
  chatSystemPrompt,
  commonSystemPrompt,
  gcpCloudProviderPrompt,
  monitoringSystemPrompt
} from './prompts';
import { getLanguageModel, getLanguageModelWithFallback, ModelWithFallback } from './providers';

function getCloudProviderPrompt(cloudProvider: string): string {
  switch (cloudProvider) {
    case 'aws':
      return awsCloudProviderPrompt;
    case 'gcp':
      return gcpCloudProviderPrompt;
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

export async function getModelInstance(name: string): Promise<LanguageModel> {
  const model = await getLanguageModel(name);
  return model.instance();
}

export async function getMonitoringModel(name: string): Promise<ModelWithFallback> {
  return await getLanguageModelWithFallback(name);
}
