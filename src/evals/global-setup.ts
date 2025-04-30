import filenamify from 'filenamify';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { ensureTestRunTraceFolderExists } from './lib/test-id';

const idFilePath = resolve(__dirname, '.eval-run-id');

// eslint-disable-next-line import/no-default-export
export default async function globalSetup() {
  const testRunId = filenamify(new Date().toISOString(), { replacement: '_' });

  writeFileSync(idFilePath, testRunId, 'utf-8');

  // eslint-disable-next-line no-process-env
  process.env.TEST_RUN_ID = testRunId;

  const testRunTraceFolder = ensureTestRunTraceFolderExists();

  console.log('Eval trace folder for run', testRunTraceFolder);
  console.log(`View eval results: http://localhost:4001/evals?folder=${testRunTraceFolder}`);
}
