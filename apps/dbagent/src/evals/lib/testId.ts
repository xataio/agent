import filenamify from 'filenamify';
import * as fs from 'fs';
import * as path from 'path';

let evalId: string | undefined;
export const setEvalId = (id: string) => {
  evalId = id;
};

export const getEvalId = () => {
  if (!evalId) {
    throw new Error('setEvalId must be called before getEvalId');
  }
  return evalId;
};

export const getTestRunId = () => {
  if (!process.env.TEST_RUN_ID) {
    throw new Error('Expected process.env.TEST_RUN_ID to be defined');
  }
  return process.env.TEST_RUN_ID;
};

export const ensureTraceFolderExists = (evalId = getEvalId()) => {
  const traceFolder = path.join('/tmp/dbagenteval', getTestRunId(), evalId);
  fs.mkdirSync(traceFolder, { recursive: true });
  return traceFolder;
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
  return filenamify(testName, { replacement: '_' });
};
