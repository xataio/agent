import filenamify from 'filenamify';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { ensureTestRunTraceFolderExists } from './lib/testId';

const idFilePath = resolve(__dirname, '.eval-run-id');

export default async function globalSetup() {
  const testRunId = filenamify(new Date().toISOString(), { replacement: '_' });

  writeFileSync(idFilePath, testRunId, 'utf-8');

  process.env.TEST_RUN_ID = testRunId;

  const testRunTrace = ensureTestRunTraceFolderExists();

  console.log('Eval trace folder for run', testRunTrace);
}
