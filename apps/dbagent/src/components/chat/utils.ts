import { ArtifactDocument } from '~/lib/db/schema';

export function getDocumentTimestampByIndex(documents: Array<ArtifactDocument>, index: number) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index]?.createdAt || new Date();
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const fetcher = async (url: string, method: Method = 'GET', body?: BodyInit) => {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as Error & {
      info: unknown;
      status: number;
    };

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
