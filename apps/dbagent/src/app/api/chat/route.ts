import { appendResponseMessages, createDataStreamResponse, DataStreamWriter, UIMessage } from 'ai';
import { notFound } from 'next/navigation';
import { NextRequest } from 'next/server';
import { generateTitleFromUserMessage } from '~/app/(main)/projects/[project]/chats/actions';
import { AugmentedLanguageModel } from '~/lib/ai/model';
import {
  artifactsPrompt,
  awsCloudProviderPrompt,
  chatSystemPrompt,
  commonSystemPrompt,
  gcpCloudProviderPrompt
} from '~/lib/ai/prompts';
import { getLanguageModel, getProviderRegistry } from '~/lib/ai/providers';
import {
  AWSDBClusterTools,
  CommonDBClusterTools,
  commonToolset,
  GCPDBClusterTools,
  getDBSQLTools,
  getPlaybookToolset
} from '~/lib/ai/tools';
import { getArtifactTools } from '~/lib/ai/tools/artifacts';
import { mcpToolset } from '~/lib/ai/tools/user-mcp';
import { deleteChatById, getChatById, getChatsByProject, saveChat } from '~/lib/db/chats';
import { getConnection } from '~/lib/db/connections';
import { DBAccess, getUserSessionDBAccess } from '~/lib/db/db';
import { getProjectById } from '~/lib/db/projects';
import { Connection, Project } from '~/lib/db/schema';
import { getTargetDbPool, Pool } from '~/lib/targetdb/db';
import { requireUserSession } from '~/utils/route';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const project = searchParams.get('project');
  if (!project) {
    return new Response('Project is required', { status: 400 });
  }

  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const dbAccess = await getUserSessionDBAccess();

  const chats = await getChatsByProject(dbAccess, { project, limit, offset });

  return Response.json({ chats });
}

type ChatModelDeps = {
  dbAccess: DBAccess;
  project: Project;
  connection: Connection;
  targetDb: Pool;
  useArtifacts: boolean;
  userId: string;
  dataStream?: DataStreamWriter;
};

const chatModel = new AugmentedLanguageModel<ChatModelDeps>({
  providerRegistry: getProviderRegistry,
  baseModel: 'chat',
  metadata: {
    tags: ['chat']
  },
  systemPrompt: [commonSystemPrompt, chatSystemPrompt],
  toolsSets: [
    { tools: mcpToolset.listMCPTools },
    { tools: commonToolset },
    { tools: async ({ targetDb }) => getDBSQLTools(targetDb).toolset() },

    // Playbook support
    { tools: async ({ dbAccess, project }) => getPlaybookToolset(dbAccess, project.id) },

    // Common cloud provider DB support
    {
      tools: async ({ dbAccess, connection }) =>
        new CommonDBClusterTools(dbAccess, () => Promise.resolve(connection)).toolset()
    }
  ]
});

// AWS cloud provider support
chatModel.addSystemPrompts(({ project }) => (project.cloudProvider === 'aws' ? awsCloudProviderPrompt : ''));
chatModel.addToolSet({
  active: (deps?: ChatModelDeps) => deps?.project.cloudProvider === 'aws',
  tools: async ({ dbAccess, connection }) => {
    return new AWSDBClusterTools(dbAccess, () => Promise.resolve(connection)).toolset();
  }
});

// GCP cloud provider support
chatModel.addSystemPrompts(({ project }) => (project.cloudProvider === 'gcp' ? gcpCloudProviderPrompt : ''));
chatModel.addToolSet({
  active: (deps?: ChatModelDeps) => deps?.project.cloudProvider === 'gcp',
  tools: async ({ dbAccess, connection }) => {
    return new GCPDBClusterTools(dbAccess, () => Promise.resolve(connection)).toolset();
  }
});

// Artifacts support
chatModel.addSystemPrompts(({ useArtifacts }) => (useArtifacts ? artifactsPrompt : ''));
chatModel.addToolSet({
  active: (deps?: ChatModelDeps) => !!deps?.useArtifacts && !!deps?.dataStream,
  tools: async ({ dbAccess, userId, project, dataStream }) => {
    return getArtifactTools({ dbAccess, userId, projectId: project.id, dataStream: dataStream! });
  }
});

export async function POST(request: Request) {
  try {
    const { id, messages, connectionId, model: modelId, useArtifacts } = await request.json();

    const userId = await requireUserSession();
    const dbAccess = await getUserSessionDBAccess();
    const connection = await getConnection(dbAccess, connectionId);
    if (!connection) {
      console.error('Connection not found', connectionId);
      return new Response('Connection not found', { status: 400 });
    }

    const project = await getProjectById(dbAccess, connection.projectId);
    if (!project) {
      return new Response('Project not found', { status: 400 });
    }

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById(dbAccess, { id });
    if (!chat) notFound();

    const targetDb = getTargetDbPool(connection.connectionString);
    // const context = getChatSystemPrompt({ cloudProvider: project.cloudProvider, useArtifacts });
    const model = await getLanguageModel(modelId);

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const result = await chatModel.streamText({
          model: model.instance(),
          deps: {
            dbAccess: await getUserSessionDBAccess(),
            project,
            connection,
            targetDb,
            useArtifacts,
            userId,
            dataStream
          },
          messages,
          maxSteps: 20,
          metadata: {
            projectId: connection.projectId,
            connectionId: connectionId,
            sessionId: id,
            model: model.info().id,
            userId,
            cloudProvider: project.cloudProvider
          },
          onFinish: async ({ response }) => {
            try {
              const assistantId = getTrailingMessageId({
                messages: response.messages.filter((message) => message.role === 'assistant')
              });

              if (!assistantId) {
                throw new Error('No assistant message found!');
              }

              const [, assistantMessage] = appendResponseMessages({
                messages: [userMessage],
                responseMessages: response.messages
              });

              if (!assistantMessage) {
                throw new Error('No assistant message found!');
              }

              const title =
                !chat.title || chat.title === 'New chat'
                  ? await generateTitleFromUserMessage({ message: userMessage })
                  : chat.title;

              await saveChat(
                dbAccess,
                {
                  ...chat,
                  title,
                  model: model.info().id
                },
                [
                  {
                    chatId: id,
                    id: userMessage.id,
                    projectId: connection.projectId,
                    role: 'user',
                    parts: userMessage.parts,
                    createdAt: new Date()
                  },
                  {
                    id: assistantId,
                    projectId: connection.projectId,
                    chatId: id,
                    role: assistantMessage.role,
                    parts: assistantMessage.parts,
                    createdAt: new Date()
                  }
                ]
              );
            } catch (error) {
              console.error('Failed to save chat', error);
            } finally {
              await targetDb.end();
            }
          }
        });

        void result.consumeStream();

        result.mergeIntoDataStream(dataStream, { sendReasoning: true });
      },
      onError: (error) => {
        console.error('Error in data stream:', error);
        return 'An error occurred while processing your request';
      }
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const dbAccess = await getUserSessionDBAccess();

  try {
    const chat = await getChatById(dbAccess, { id });
    if (!chat) notFound();

    await deleteChatById(dbAccess, { id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500
    });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const { title } = await request.json();
  if (!title) {
    return new Response('Title is required', { status: 400 });
  }

  const dbAccess = await getUserSessionDBAccess();

  try {
    const chat = await getChatById(dbAccess, { id });
    if (!chat) notFound();

    await saveChat(dbAccess, { ...chat, title });

    return new Response('Chat updated', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500
    });
  }
}

function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

function getTrailingMessageId({ messages }: { messages: Array<{ id: string }> }): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}
