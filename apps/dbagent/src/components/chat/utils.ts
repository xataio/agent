import { Document } from '~/lib/db/schema';

export function getDocumentTimestampByIndex(documents: Array<Document>, index: number) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index]?.createdAt || new Date();
}
