import { DataStreamWriter, LanguageModel } from 'ai';
import { Pool } from 'pg';
import { DBAccess } from '../db/db';
import { CloudProvider, Connection } from '../db/schema';
import { AugmentedLanguageModel, ToolSet } from './model';
import {
  artifactsPrompt,
  awsCloudProviderPrompt,
  chatSystemPrompt,
  commonSystemPrompt,
  gcpCloudProviderPrompt,
  monitoringSystemPrompt
} from './prompts';
import { getLanguageModel, getLanguageModelWithFallback, getProviderRegistry, ModelWithFallback } from './providers';
import { commonToolset } from './tools';
import { ArtifactsService, getArtifactTools, projectArtifactService } from './tools/artifacts';
import { ClusterService, getDBClusterTools, getProjectClusterService } from './tools/cluster';
import { DBService, getDBSQLTools, targetDBService } from './tools/db';
import { getPlaybookToolset, PlaybookService, projectPlaybookService } from './tools/playbook';
import { mcpToolset } from './tools/user-mcp';

export type AgentModelDeps = {
  withMCP?: boolean;
  targetDb: DBService;
  playbookService: PlaybookService;
  clusterService: ClusterService;
  artifactsService?: ArtifactsService;
};

export function agentModelDeps({
  withMCP,
  targetDb,
  dbAccess,
  connection,
  userId,
  cloudProvider,
  withArtifacts,
  dataStream
}: {
  withMCP: boolean;
  targetDb: Pool;
  dbAccess: DBAccess;
  connection: Connection;
  cloudProvider: CloudProvider;
  userId: string;
  withArtifacts?: boolean;
  dataStream?: DataStreamWriter;
}): AgentModelDeps {
  return {
    withMCP,
    targetDb: targetDBService(targetDb),
    playbookService: projectPlaybookService(dbAccess, connection.projectId),
    clusterService: getProjectClusterService(dbAccess, connection, cloudProvider),
    artifactsService:
      withArtifacts && dataStream
        ? projectArtifactService({
            userId: userId,
            projectId: connection.projectId,
            dataStream: dataStream,
            dbAccess: dbAccess
          })
        : undefined
  };
}

export function getAgentMockDeps({
  withMCP = false,
  useArtifacts = false,
  targetDbService,
  playbookService,
  clusterService,
  artifactsService
}: {
  withMCP?: boolean;
  useArtifacts?: boolean;
  targetDbService?: DBService;
  playbookService?: PlaybookService;
  clusterService?: ClusterService | CloudProvider;
  artifactsService?: ArtifactsService;
}): AgentModelDeps {
  const mockHandler = {
    get(_target: any, prop: any, _receiver: any) {
      console.trace(`Stack trace for property access: ${prop}`);
      throw new Error(`Not implemented: ${prop}`);
    }
  };

  const useClusterService = clusterService
    ? typeof clusterService === 'string'
      ? getMockClusterService(clusterService)
      : clusterService
    : getMockClusterService('aws');

  return {
    withMCP: withMCP ?? false,
    targetDb: targetDbService || new Proxy<DBService>({} as DBService, mockHandler),
    playbookService: playbookService || new Proxy<PlaybookService>({} as PlaybookService, mockHandler),
    clusterService: useClusterService,
    artifactsService:
      artifactsService || (useArtifacts ? new Proxy<ArtifactsService>({} as ArtifactsService, mockHandler) : undefined)
  };
}

export function getMockClusterService(cloudProvider: CloudProvider): ClusterService {
  const mockData = {
    type: cloudProvider
  };

  return new Proxy<ClusterService>(mockData as unknown as ClusterService, {
    get(target, prop): any {
      if (!(prop in target)) {
        console.trace(`Stack trace for property access: ${String(prop)}`);
        throw new Error(`Property ${String(prop)} is not implemented in mockData.`);
      }
      return target[prop as keyof typeof target];
    }
  });
}

export const toolsets = [
  {
    active: (deps?: { withMCP: boolean }) => {
      const enabled = !deps || deps.withMCP !== false;
      return enabled;
    },
    tools: mcpToolset.listMCPTools
  },
  { tools: commonToolset },

  // Target DB support
  { tools: async ({ targetDb }: { targetDb: DBService }) => getDBSQLTools({ db: targetDb }) },

  // Playbook support
  { tools: async ({ playbookService }: { playbookService: PlaybookService }) => getPlaybookToolset(playbookService) },

  // Cloud provider support
  {
    systemPrompt: ({ clusterService }: { clusterService: ClusterService }) =>
      clusterService.type === 'aws'
        ? awsCloudProviderPrompt
        : clusterService.type === 'gcp'
          ? gcpCloudProviderPrompt
          : '',
    tools: async ({ clusterService }: { clusterService: ClusterService }) => getDBClusterTools(clusterService)
  },

  // Artifacts support
  {
    active: (deps?: { artifactsService: ArtifactsService }) => !!deps?.artifactsService,
    systemPrompt: artifactsPrompt,
    tools: async ({ artifactsService }: { artifactsService: ArtifactsService }) => {
      return getArtifactTools({ tools: artifactsService });
    }
  }
];

export const commonModel = new AugmentedLanguageModel<AgentModelDeps>({
  providerRegistry: getProviderRegistry,
  baseModel: 'chat'
});

export const chatModel = new AugmentedLanguageModel<AgentModelDeps>({
  providerRegistry: getProviderRegistry,
  baseModel: 'chat',
  metadata: {
    tags: ['chat']
  },
  systemPrompt: [commonSystemPrompt, chatSystemPrompt],
  toolsets: toolsets as ToolSet<AgentModelDeps>[]
});

export const monitoringModel = new AugmentedLanguageModel<AgentModelDeps>({
  providerRegistry: getProviderRegistry,
  baseModel: 'chat',
  metadata: {
    tags: ['monitoring']
  },
  systemPrompt: [commonSystemPrompt, monitoringSystemPrompt],
  toolsets: toolsets as ToolSet<AgentModelDeps>[]
});

export const titleModel = new AugmentedLanguageModel({
  providerRegistry: getProviderRegistry,
  baseModel: 'title',
  systemPrompt: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
  metadata: {
    tags: ['internal', 'chat', 'title']
  }
});

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
