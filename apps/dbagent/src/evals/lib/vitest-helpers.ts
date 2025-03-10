import { it } from 'vitest';
import { setEvalId } from './test-id';

export type TestCase = {
  only?: boolean;
};

export type NamedTestCase = TestCase & {
  name: string;
};

export const createTest = (isOnlyTest: boolean, testName: string, testFn: () => void | Promise<void>) => {
  return isOnlyTest ? it.only(testName, testFn) : it(testName, testFn);
};

export const runNamedTests = <T extends NamedTestCase>(testCases: T[], runTest: (testCase: T) => void) => {
  testCases.forEach((testCase) => {
    createTest(Boolean(testCase.only), testCase.name, () => runTest(testCase));
  });
};

export const runTests = <T extends TestCase>(
  testCases: T[],
  nameFunc: (testCase: T) => string,
  runTest: (testCase: T) => void
) => {
  testCases.forEach((testCase) => {
    createTest(Boolean(testCase.only), nameFunc(testCase), () => runTest(testCase));
  });
};

export type EvalCase = TestCase & { id: string };

export type NamedEvalCase = NamedTestCase & { id: string };

export const runEvals = <T extends EvalCase>(testCases: T[], runTest: (testCase: T) => void | Promise<void>) => {
  runTests(
    testCases,
    ({ id }) => id,
    async (evalCase) => {
      setEvalId(evalCase.id);
      await runTest(evalCase);
    }
  );
};

export const runNamedEvals = <T extends NamedEvalCase>(
  testCases: T[],
  runTest: (testCase: T) => void | Promise<void>
) => {
  runNamedTests(testCases, async (evalCase) => {
    setEvalId(evalCase.id);
    await runTest(evalCase);
  });
};
