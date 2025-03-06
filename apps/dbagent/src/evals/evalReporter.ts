import fs from 'fs';
import path from 'path';
import { Reporter } from 'vitest/reporters';
import z from 'zod';
import { ensureTraceFolderExists, testNameToEvalId } from './lib/testId';

const testCaseResultSchema = z.object({ id: z.string(), result: z.enum(['passed', 'failed']) }).strict();
type TestCaseResult = z.infer<typeof testCaseResultSchema>;

export const evalReporter: Reporter = {
  onTestRunEnd: (testModules, unhandledErrors, reason) => {
    // console.log(
    //   'zzz testModule',
    //   // JSON.stringify(testModules, null, 2),
    //   testModules,
    //   testModules[0]?.state(),
    //   // testModules[0]?.task,
    //
    //   reason
    //   // testModules.forEach((tm) => tm.children)
    // );
  },
  onTestCaseResult: (testCase) => {
    if (['skipped', 'pending'].includes(testCase.result().state)) {
      return;
    }
    const testCaseResult = {
      id: testCase.name,
      result: testCase.result().state as 'passed' | 'failed'
    } satisfies TestCaseResult;

    testCaseResultSchema.parse(testCaseResult);

    const evalId = testNameToEvalId(testCase.name);
    const traceFolder = ensureTraceFolderExists(evalId);

    fs.writeFileSync(path.join(traceFolder, `testResult.json`), JSON.stringify(testCaseResult, null, 2));
  }
};
