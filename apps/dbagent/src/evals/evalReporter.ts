import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { Reporter } from 'vitest/reporters';
import z from 'zod';
import { ensureTestRunTraceFolderExists, ensureTraceFolderExists, testNameToEvalId } from './lib/testId';

const testCaseResultSchema = z.object({ id: z.string(), result: z.enum(['passed', 'failed']) }).strict();
type TestCaseResult = z.infer<typeof testCaseResultSchema>;

const testCaseSummarySchema = z
  .object({
    id: z.string(),
    result: z.enum(['passed', 'failed']),
    logFiles: z.array(z.string())
  })
  .strict();

export const evalReporter: Reporter = {
  onTestRunEnd: () => {
    const evalTraceFolder = ensureTestRunTraceFolderExists();

    const folders = fs.readdirSync(evalTraceFolder);
    const testResults = folders.map((folder) => {
      const testResult = testCaseResultSchema.parse(
        JSON.parse(fs.readFileSync(path.join(evalTraceFolder, folder, 'testResult.json'), 'utf-8'))
      );
      const logFiles = fs
        .readdirSync(path.join(evalTraceFolder, folder))
        .filter((file) => file !== 'testResult.json')
        .map((file) => path.join(evalTraceFolder, folder, file));

      const testCaseSummary = testCaseSummarySchema.parse({ ...testResult, logFiles });
      return testCaseSummary;
    });
    fs.writeFileSync(path.join(evalTraceFolder, 'testResults.json'), JSON.stringify(testResults, null, 2));

    const csvTestResults = testResults.map((testResult) => {
      const result: any = {
        id: testResult.id,
        result: testResult.result
      };
      testResult.logFiles.forEach((logFile, index) => {
        result[`logfile_${index}`] = logFile;
      });
      return result;
    });

    const csvContents = Papa.unparse(csvTestResults);
    fs.writeFileSync(path.join(evalTraceFolder, 'testResults.csv'), csvContents);
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
