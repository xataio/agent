import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { TestCase } from 'vitest/node';
import { Reporter } from 'vitest/reporters';
import { delay } from '~/utils/delay';
import { env } from '../lib/env/eval';
import { EVAL_RESULT_FILE_NAME, EVAL_RESULTS_CSV_FILE_NAME, EVAL_RESULTS_FILE_NAME } from './lib/consts';
import { EvalResult, evalResultSchema, evalSummarySchema } from './lib/schemas';
import { ensureTestRunTraceFolderExists, ensureTraceFolderExists, testNameToEvalId } from './lib/test-id';

const getEnv = () => {
  return {
    JUDGE_MODEL: env.JUDGE_MODEL,
    CHAT_MODEL: env.CHAT_MODEL
  };
};

// eslint-disable-next-line import/no-default-export
export default class EvalReporter implements Reporter {
  async onTestRunEnd() {
    const evalTraceFolder = ensureTestRunTraceFolderExists();

    const folders = fs.readdirSync(evalTraceFolder);
    const testResults = folders.map((folder) => {
      const testResult = evalResultSchema.parse(
        JSON.parse(fs.readFileSync(path.join(evalTraceFolder, folder, EVAL_RESULT_FILE_NAME), 'utf-8'))
      );
      const logFiles = fs
        .readdirSync(path.join(evalTraceFolder, folder))
        .filter((file) => file !== EVAL_RESULT_FILE_NAME)
        .map((file) => path.join(evalTraceFolder, folder, file));

      const testCaseSummary = evalSummarySchema.parse({ ...testResult, logFiles, env: getEnv() });
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
    // hack: make sure this message is printed last
    await delay(1000);
    console.log(`View eval results: http://localhost:4001/evals?folder=${evalTraceFolder}`);
  }

  onTestCaseResult(testCase: TestCase) {
    if (['skipped', 'pending'].includes(testCase.result().state)) {
      return;
    }
    const evalId = testNameToEvalId(testCase.fullName);

    const testCaseResult = {
      id: evalId,
      result: testCase.result().state as 'passed' | 'failed',
      env: getEnv()
    } satisfies EvalResult;

    evalResultSchema.parse(testCaseResult);

    const traceFolder = ensureTraceFolderExists(evalId);

    fs.writeFileSync(path.join(traceFolder, EVAL_RESULT_FILE_NAME), JSON.stringify(testCaseResult, null, 2));
  }
}
