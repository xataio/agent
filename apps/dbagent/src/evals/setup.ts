import { randomUUID } from 'crypto';
import { expect } from 'vitest';
import { testNameToEvalId } from './lib/test-id';

// @ts-expect-error
globalThis.__TEST_ID__ = () => {
  const testState = expect.getState();
  return testNameToEvalId(testState.currentTestName);
};

// This only works if you switch vitest to use a single worker process `threads: false`
// @ts-expect-error
if (!globalThis.__TEST_RUN_ID__) {
  // @ts-expect-error
  globalThis.__TEST_RUN_ID__ = randomUUID(); // Unique ID for this test session
}
