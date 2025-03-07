import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { EVAL_RESULTS_FILE_NAME } from '~/evals/lib/consts';
import { testCaseSummarySchema } from '~/evals/lib/schemas';

const Eval = async ({ params }: { params: Promise<{ folder: string }> }) => {
  const { folder: encodedFolder } = await params;
  const folder = decodeURIComponent(encodedFolder);
  console.log('zzz x', folder);
  const evalResultsString = fs.readFileSync(path.join(folder, EVAL_RESULTS_FILE_NAME), 'utf8');
  const evalResults = z.array(testCaseSummarySchema).parse(JSON.parse(evalResultsString));
  console.log('zzz y', evalResults);
  return <div>Hello</div>;
};

export default Eval;
