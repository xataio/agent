import { DocumentHandler } from './server-document-handler';
import { sheetDocumentHandler } from './sheet/server';
import { textDocumentHandler } from './text/server';

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [textDocumentHandler, sheetDocumentHandler];

export const artifactKinds = ['text', 'sheet'] as const;
