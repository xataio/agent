import { it } from 'vitest';
import { setEvalId } from './testId';

export type TestCase = {
  focus?: boolean;
};

export type NamedTestCase = TestCase & {
  name: string;
};

export const createTest = (shouldFocus: boolean, testName: string, testFn: () => void | Promise<void>) => {
  return shouldFocus ? it.only(testName, testFn) : it(testName, testFn);
};

export const runNamedTests = <T extends NamedTestCase>(testCases: T[], runTest: (testCase: T) => void) => {
  testCases.forEach((testCase) => {
    createTest(Boolean(testCase.focus), testCase.name, () => runTest(testCase));
  });
};

export const runTests = <T extends TestCase>(
  testCases: T[],
  nameFunc: (testCase: T) => string,
  runTest: (testCase: T) => void
) => {
  testCases.forEach((testCase) => {
    createTest(Boolean(testCase.focus), nameFunc(testCase), () => runTest(testCase));
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
