import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';
import { ensureTraceFolderExists } from './testId';

export const traceVercelAiResponse = (response: Awaited<ReturnType<typeof generateText>>) => {
  const traceFolder = ensureTraceFolderExists();

  const humanTraceFile = path.join(traceFolder, 'human.txt');
  const humanTrace = `
    Text: ${response.text}
  `;
  fs.writeFileSync(humanTraceFile, humanTrace);

  const responseJson = path.join(traceFolder, 'response.json');
  fs.writeFileSync(responseJson, JSON.stringify(response, null, 2));
};
