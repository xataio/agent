import { describe, expect } from 'vitest';
import { evalChat } from '~/evals/lib/chatRunner';
import { EvalCase, runEvals } from '../lib/vitestHelpers';

// vi.spyOn(dbinfoExports, 'getDbInfo').mockImplementation(async (connectionId, key) => {
//   if (key === 'tables') {
//     return [
//       {
//         name: 'dogs',
//         schema: 'public',
//         rows: 150,
//         size: '24 kB',
//         seqScans: 45,
//         idxScans: 120,
//         nTupIns: 200,
//         nTupUpd: 50,
//         nTupDel: 10
//       }
//     ];
//   }
//   return null;
// });

type ToolChoiceEval = EvalCase & { prompt: string; toolCalls: string[] };

describe('tool choice', () => {
  const testCases: ToolChoiceEval[] = [
    {
      id: 'tables_in_db',
      prompt: 'What tables do I have in my db?',
      toolCalls: ['getTablesAndInstanceInfo']
    },
    {
      id: 'how_many_tables',
      prompt: 'How many tables in my database?',
      toolCalls: ['getTablesAndInstanceInfo']
    }
  ];
  runEvals(
    testCases,
    ({ prompt, toolCalls }) => `${prompt}, calls: ${JSON.stringify(toolCalls)}`,
    async ({ prompt, toolCalls }) => {
      const result = await evalChat({
        messages: [{ role: 'user', content: prompt }]
      });

      const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
      const toolCallNames = allToolCalls.map((toolCall) => toolCall.toolName);
      expect(toolCallNames).toEqual(toolCalls);
    }
  );
});
