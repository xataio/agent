import { it, TestContext, TestFunction } from 'vitest';

export type TestCase = {
  only?: boolean;
};

export type NamedTestCase = TestCase & {
  name: string;
};

export const createTest = (isOnlyTest: boolean, testName: string, testFn: TestFunction) => {
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
  runTest: (testCase: T, testContext: TestContext) => void
) => {
  testCases.forEach((testCase) => {
    createTest(Boolean(testCase.only), nameFunc(testCase), (context) => {
      return runTest(testCase, context);
    });
  });
};

export type EvalCase = TestCase & { id: string };

export type NamedEvalCase = NamedTestCase & { id: string };

export const runEvals = <T extends EvalCase>(
  testCases: T[],
  runTest: (testCase: T, testContext: TestContext) => void | Promise<void>
) => {
  runTests(
    testCases,
    ({ id }) => id,
    async (evalCase, testContext) => {
      await runTest(evalCase, testContext);
    }
  );
};

export const runNamedEvals = <T extends NamedEvalCase>(
  testCases: T[],
  runTest: (testCase: T) => void | Promise<void>
) => {
  runNamedTests(testCases, async (evalCase) => {
    await runTest(evalCase);
  });
};
