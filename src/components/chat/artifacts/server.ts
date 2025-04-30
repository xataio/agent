import { DataStreamWriter } from 'ai';
import { saveDocument } from '~/lib/db/chats';
import { DBAccess } from '~/lib/db/db';
import { ArtifactDocument } from '~/lib/db/schema';
import { ArtifactKind } from './artifact';
import { sheetDocumentHandler } from './sheet/server';
import { textDocumentHandler } from './text/server';

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}

export interface CreateDocumentCallbackProps {
  id: string;
  title: string;
  dataStream: DataStreamWriter;
  userId: string;
  projectId: string;
  dbAccess: DBAccess;
}

export interface UpdateDocumentCallbackProps {
  document: ArtifactDocument;
  description: string;
  dataStream: DataStreamWriter;
  userId: string;
  projectId: string;
  dbAccess: DBAccess;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
        userId: args.userId,
        projectId: args.projectId,
        dbAccess: args.dbAccess
      });

      await saveDocument(args.dbAccess, {
        id: args.id,
        title: args.title,
        content: draftContent,
        kind: config.kind,
        projectId: args.projectId,
        userId: args.userId
      });

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        userId: args.userId,
        projectId: args.projectId,
        dbAccess: args.dbAccess
      });

      await saveDocument(args.dbAccess, {
        id: args.document.id,
        title: args.document.title,
        content: draftContent,
        kind: config.kind,
        projectId: args.projectId,
        userId: args.userId
      });

      return;
    }
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [textDocumentHandler, sheetDocumentHandler];

export const artifactKinds = ['text', 'sheet'] as const;
