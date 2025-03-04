import { randomUUID } from 'crypto';
import filenamify from 'filenamify';
import { expect } from 'vitest';

const splitKeyword = 'dbagent/src/evals/';

const getRelativeTestPath = (testPath: string | undefined) => {
  if (!testPath) {
    throw new Error('Expected testPath to be defined');
  }
  const parts = testPath.split(splitKeyword);
  if (parts.length !== 2) {
    throw new Error(`Expected testPath to contain exactly 2 parts, but got ${parts.length}`);
  }
  return parts[1] as string;
};

// @ts-expect-error
globalThis.__TEST_ID__ = () => {
  const testState = expect.getState();
  const testId = `${getRelativeTestPath(testState.testPath)}_${testState.currentTestName}`;
  return filenamify(testId, { replacement: '_' });
};

// This only works if you switch vitest to use a single worker process `threads: false`
// @ts-expect-error
if (!globalThis.__TEST_RUN_ID__) {
  // @ts-expect-error
  globalThis.__TEST_RUN_ID__ = randomUUID(); // Unique ID for this test session
}
