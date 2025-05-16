import { DataStreamWriter } from 'ai';
import { z } from 'zod';
import { ArtifactKind } from '~/components/chat/artifacts/artifact';
import { artifactKinds, documentHandlersByArtifactKind } from '~/components/chat/artifacts/server';
import { generateUUID } from '~/components/chat/utils';
import { getDocumentById, saveSuggestions } from '~/lib/db/chats';
import { ArtifactSuggestion } from '~/lib/db/schema';
import { commonModel } from '../ai/agent';
import { DBAccess } from '../db/db';

export type ArtifactProjectProps = {
  userId: string;
  projectId: string;
  dataStream: DataStreamWriter;
  dbAccess: DBAccess;
};

export interface ArtifactsService {
  createDocument({ title, kind }: { title: string; kind: (typeof artifactKinds)[number] }): Promise<DocumentOpResult>;
  updateDocument({ id, description }: { id: string; description: string }): Promise<DocumentOpResult>;
  requestSuggestions({ documentId }: { documentId: string }): Promise<DocumentOpResult>;
}

export type DocumentOpResult =
  | {
      id: string;
      title: string;
      kind: ArtifactKind;
    }
  | {
      error: string;
    };

export function projectArtifactService(project: ArtifactProjectProps): ArtifactsService {
  return {
    createDocument: async ({ title, kind }) => await execCreateDocument(project, { title, kind }),
    updateDocument: async ({ id, description }) => await execUpdateDocument(project, { id, description }),
    requestSuggestions: async ({ documentId }) => await execRequestSuggestions(project, { documentId })
  };
}

export const execCreateDocument = async (
  { dataStream, userId, projectId, dbAccess }: ArtifactProjectProps,
  { title, kind }: { title: string; kind: ArtifactKind }
): Promise<DocumentOpResult> => {
  const id = generateUUID();

  dataStream.writeData({
    type: 'kind',
    content: kind
  });

  dataStream.writeData({
    type: 'id',
    content: id
  });

  dataStream.writeData({
    type: 'title',
    content: title
  });

  dataStream.writeData({
    type: 'clear',
    content: ''
  });

  const documentHandler = documentHandlersByArtifactKind.find(
    (documentHandlerByArtifactKind) => documentHandlerByArtifactKind.kind === kind
  );

  if (!documentHandler) {
    throw new Error(`No document handler found for kind: ${kind}`);
  }

  await documentHandler.onCreateDocument({
    id,
    title,
    dataStream,
    userId,
    projectId,
    dbAccess
  });

  dataStream.writeData({ type: 'finish', content: '' });

  return {
    id,
    title,
    kind
  };
};

export const execUpdateDocument = async (
  { dataStream, userId, projectId, dbAccess }: ArtifactProjectProps,
  { id, description }: { id: string; description: string }
): Promise<DocumentOpResult> => {
  const document = await getDocumentById(dbAccess, { id });

  if (!document) {
    return {
      error: 'Document not found'
    };
  }

  dataStream.writeData({
    type: 'clear',
    content: document.title
  });

  const documentHandler = documentHandlersByArtifactKind.find(
    (documentHandlerByArtifactKind) => documentHandlerByArtifactKind.kind === document.kind
  );

  if (!documentHandler) {
    throw new Error(`No document handler found for kind: ${document.kind}`);
  }

  await documentHandler.onUpdateDocument({
    document,
    description,
    dataStream,
    userId,
    projectId,
    dbAccess
  });

  dataStream.writeData({ type: 'finish', content: '' });

  return {
    id,
    title: document.title,
    kind: document.kind
  };
};

export const execRequestSuggestions = async (
  { dataStream, userId, projectId, dbAccess }: ArtifactProjectProps,
  { documentId }: { documentId: string }
): Promise<DocumentOpResult> => {
  const document = await getDocumentById(dbAccess, { id: documentId });
  if (!document || !document.content) {
    return {
      error: 'Document not found'
    };
  }

  const suggestions: Array<Omit<ArtifactSuggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>> = [];

  const { elementStream } = await commonModel.streamObject({
    system:
      'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
    prompt: document.content,
    output: 'array',
    schema: z.object({
      originalSentence: z.string().describe('The original sentence'),
      suggestedSentence: z.string().describe('The suggested sentence'),
      description: z.string().describe('The description of the suggestion')
    }),
    metadata: {
      tags: ['artifact', 'suggestion']
    }
  });

  for await (const element of elementStream) {
    const suggestion = {
      originalText: element.originalSentence,
      suggestedText: element.suggestedSentence,
      description: element.description,
      id: generateUUID(),
      documentId: documentId,
      isResolved: false,
      projectId
    };

    dataStream.writeData({
      type: 'suggestion',
      content: suggestion
    });

    suggestions.push(suggestion);
  }

  await saveSuggestions(dbAccess, {
    suggestions: suggestions.map((suggestion) => ({
      ...suggestion,
      userId,
      projectId,
      createdAt: new Date(),
      documentCreatedAt: document.createdAt
    }))
  });

  return {
    id: documentId,
    title: document.title,
    kind: document.kind
  };
};
