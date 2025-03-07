import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { TestSuiteViewer } from '~/components/evals/eval-runs';
import { EVAL_RESULTS_FILE_NAME } from '~/evals/lib/consts';
import { testCaseSummarySchema } from '~/evals/lib/schemas';

type SearchParams = {
  folder?: string;
  evalId?: string;
};

const Eval = async ({ searchParams }: { searchParams: Promise<SearchParams> }) => {
  const { folder, evalId } = await searchParams;
  if (!folder) {
    throw new Error('Folder parameter is required');
  }
  const evalResultsString = fs.readFileSync(path.join(folder, EVAL_RESULTS_FILE_NAME), 'utf8');
  const evalResults = z.array(testCaseSummarySchema).parse(JSON.parse(evalResultsString));
  return <TestSuiteViewer evalSummaries={evalResults} evalFolder={folder} initialEvalId={evalId} />;
};

export default Eval;
