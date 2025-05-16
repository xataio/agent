import { Chat, LLMTurn } from './types';

export type DatasetItem = LLMTurn | Chat;
export type Dataset<T extends DatasetItem> = AsyncIterable<T>;

import { promises as fs } from 'fs';

import ndjson from 'ndjson';

export async function writeToJSONFile<T extends DatasetItem>(dataset: Dataset<T>, path: string) {
  const file = await fs.open(path, 'w');
  try {
    const writer = file.createWriteStream().pipe(ndjson.stringify());
    for await (const item of dataset) {
      writer.write(item);
    }
  } finally {
    await file.close();
  }
}

export async function* readFromJSONFile<T extends DatasetItem>(path: string): AsyncGenerator<T> {
  const file = await fs.open(path, 'r');
  try {
    const reader = file.createReadStream().pipe(ndjson.parse());
    for await (const item of reader) {
      yield item;
    }
  } finally {
    await file.close();
  }
}
