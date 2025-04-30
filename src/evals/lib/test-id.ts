import * as fs from 'fs';
import * as path from 'path';
import { ExpectStatic } from 'vitest';

/* eslint no-process-env: 0 */

export const getEvalId = (expect: ExpectStatic) => {
  const testName = expect.getState().currentTestName;
  return testNameToEvalId(testName);
};

export const getTestRunId = () => {
  if (!process.env.TEST_RUN_ID) {
    throw new Error('Expected process.env.TEST_RUN_ID to be defined');
  }
  return process.env.TEST_RUN_ID;
};

export const ensureTraceFolderExists = (evalId: string) => {
  const traceFolder = path.join('/tmp/dbagenteval', getTestRunId(), evalId);
  fs.mkdirSync(traceFolder, { recursive: true });
  return traceFolder;
};

export const ensureTraceFolderExistsExpect = (expect: ExpectStatic) => {
  const evalId = getEvalId(expect);
  return ensureTraceFolderExists(evalId);
};

export const ensureTestRunTraceFolderExists = () => {
  const traceFolder = path.join('/tmp/dbagenteval', getTestRunId());
  fs.mkdirSync(traceFolder, { recursive: true });
  return traceFolder;
};

export const testNameToEvalId = (testName: string | undefined) => {
  if (!testName) {
    throw new Error('Expected testName to be defined');
  }
  return testName?.replace(' > ', '_');
};
