import { DataStreamWriter, streamObject, tool, Tool } from 'ai';
import { z } from 'zod';
import { artifactKinds, documentHandlersByArtifactKind } from '~/components/chat/artifacts/server';
import { generateUUID } from '~/components/chat/utils';
import { getDocumentById, saveSuggestions } from '~/lib/db/chats';
import { DBAccess } from '~/lib/db/db';
import { ArtifactSuggestion } from '~/lib/db/schema';
import { getModelInstance } from '../agent';

interface ArtifactToolProps {
  userId: string;
  projectId: string;
  dataStream: DataStreamWriter;
  dbAccess: DBAccess;
}

export function getArtifactTools({ userId, projectId, dataStream, dbAccess }: ArtifactToolProps): Record<string, Tool> {
  return {
    createDocument: createDocument({ userId, projectId, dataStream, dbAccess }),
    updateDocument: updateDocument({ userId, projectId, dataStream, dbAccess }),
    requestSuggestions: requestSuggestions({
      userId,
      projectId,
      dataStream,
      dbAccess
    })
  };
}

export const createDocument = ({ userId, projectId, dataStream, dbAccess }: ArtifactToolProps) =>
  tool({
    description:
      'Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.',
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds)
    }),
    execute: async ({ title, kind }) => {
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
        kind,
        content: 'A document was created and is now visible to the user.'
      };
    }
  });

export const updateDocument = ({ userId, projectId, dataStream, dbAccess }: ArtifactToolProps) =>
  tool({
    description: 'Update a document with the given description.',
    parameters: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z.string().describe('The description of changes that need to be made')
    }),
    execute: async ({ id, description }) => {
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
        kind: document.kind,
        content: 'The document has been updated successfully.'
      };
    }
  });

export const requestSuggestions = ({ userId, projectId, dataStream, dbAccess }: ArtifactToolProps) =>
  tool({
    description: 'Request suggestions for a document',
    parameters: z.object({
      documentId: z.string().describe('The ID of the document to request edits')
    }),
    execute: async ({ documentId }) => {
      const document = await getDocumentById(dbAccess, { id: documentId });

      if (!document || !document.content) {
        return {
          error: 'Document not found'
        };
      }

      const suggestions: Array<Omit<ArtifactSuggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>> = [];

      const { elementStream } = streamObject({
        model: await getModelInstance('chat'),
        experimental_telemetry: {
          isEnabled: true,
          metadata: {
            tags: ['artifact', 'suggestion']
          }
        },
        system:
          'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
        prompt: document.content,
        output: 'array',
        schema: z.object({
          originalSentence: z.string().describe('The original sentence'),
          suggestedSentence: z.string().describe('The suggested sentence'),
          description: z.string().describe('The description of the suggestion')
        })
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
        kind: document.kind,
        message: 'Suggestions have been added to the document'
      };
    }
  });
