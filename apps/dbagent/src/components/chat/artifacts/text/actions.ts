'use server';

import { getSuggestionsByDocumentId } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';

export async function getSuggestions({ documentId }: { documentId: string }) {
  const dbAccess = await getUserSessionDBAccess();
  const suggestions = await getSuggestionsByDocumentId(dbAccess, { documentId });
  return suggestions ?? [];
}
