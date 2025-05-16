import { tool, Tool } from 'ai';
import { z } from 'zod';
import { artifactKinds } from '~/components/chat/artifacts/server';
import { ArtifactsService } from '~/lib/tools/artifacts';

interface ArtifactToolProps {
  tools: ArtifactsService;
}

export function getArtifactTools({ tools }: ArtifactToolProps): Record<string, Tool> {
  return {
    createDocument: createDocument({ tools }),
    updateDocument: updateDocument({ tools }),
    requestSuggestions: requestSuggestions({ tools })
  };
}

export const createDocument = ({ tools }: ArtifactToolProps) =>
  tool({
    description:
      'Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.',
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds)
    }),
    execute: async ({ title, kind }) => {
      const result = await tools.createDocument({ title, kind });
      return {
        ...result,
        content: 'A document was created and is now visible to the user.'
      };
    }
  });

export const updateDocument = ({ tools }: ArtifactToolProps) =>
  tool({
    description: 'Update a document with the given description.',
    parameters: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z.string().describe('The description of changes that need to be made')
    }),
    execute: async ({ id, description }) => {
      const result = await tools.updateDocument({ id, description });
      if ('error' in result) {
        return result;
      }
      return {
        ...result,
        content: 'The document has been updated successfully.'
      };
    }
  });

export const requestSuggestions = ({ tools }: ArtifactToolProps) =>
  tool({
    description: 'Request suggestions for a document',
    parameters: z.object({
      documentId: z.string().describe('The ID of the document to request edits')
    }),
    execute: async ({ documentId }) => {
      const result = await tools.requestSuggestions({ documentId });
      if ('error' in result) {
        return result;
      }
      return {
        ...result,
        message: 'Suggestions have been added to the document'
      };
    }
  });
