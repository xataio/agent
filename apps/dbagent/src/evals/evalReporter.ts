import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { Reporter } from 'vitest/reporters';
import { EVAL_RESULT_FILE_NAME, EVAL_RESULTS_CSV_FILE_NAME, EVAL_RESULTS_FILE_NAME } from './lib/consts';
import { TestCaseResult, testCaseResultSchema, testCaseSummarySchema } from './lib/schemas';
import { ensureTestRunTraceFolderExists, ensureTraceFolderExists, testNameToEvalId } from './lib/testId';

export const evalReporter: Reporter = {
  onTestRunEnd: () => {
    const evalTraceFolder = ensureTestRunTraceFolderExists();

    const folders = fs.readdirSync(evalTraceFolder);
    const testResults = folders.map((folder) => {
      const testResult = testCaseResultSchema.parse(
        JSON.parse(fs.readFileSync(path.join(evalTraceFolder, folder, EVAL_RESULT_FILE_NAME), 'utf-8'))
      );
      const logFiles = fs
        .readdirSync(path.join(evalTraceFolder, folder))
        .filter((file) => file !== EVAL_RESULT_FILE_NAME)
        .map((file) => path.join(evalTraceFolder, folder, file));

      const testCaseSummary = testCaseSummarySchema.parse({ ...testResult, logFiles });
      return testCaseSummary;
    });
    fs.writeFileSync(path.join(evalTraceFolder, EVAL_RESULTS_FILE_NAME), JSON.stringify(testResults, null, 2));

    const csvTestResults = testResults.map((testResult) => {
      const result: any = {
        id: testResult.id,
        result: testResult.result,
        ui: `http://localhost:4001/evals?folder=${evalTraceFolder}&evalId=${testResult.id}`
      };
      testResult.logFiles.forEach((logFile, index) => {
        result[`logfile_${index}`] = logFile;
      });
      return result;
    });

    const csvContents = Papa.unparse(csvTestResults);
    fs.writeFileSync(path.join(evalTraceFolder, EVAL_RESULTS_CSV_FILE_NAME), csvContents);

    console.log(`View eval results: http://localhost:4001/evals?folder=${evalTraceFolder}`);
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

    fs.writeFileSync(path.join(traceFolder, EVAL_RESULT_FILE_NAME), JSON.stringify(testCaseResult, null, 2));
  }
};
