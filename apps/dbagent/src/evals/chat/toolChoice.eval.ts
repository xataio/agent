import { describe, expect, test, vi } from 'vitest';
import { evalChat } from '~/evals/lib/chatRunner';
import * as dbinfoExports from '~/lib/db/dbinfo';

describe('tool choice', () => {
  test('test name', async () => {
    vi.spyOn(dbinfoExports, 'getDbInfo').mockImplementation(async (connectionId, key) => {
      if (key === 'tables') {
        return [
          {
            name: 'dogs',
            schema: 'public',
            rows: 150,
            size: '24 kB',
            seqScans: 45,
            idxScans: 120,
            nTupIns: 200,
            nTupUpd: 50,
            nTupDel: 10
          }
        ];
      }
      return null;
    });
    const result = await evalChat({
      messages: [{ role: 'user', content: 'What tables do I have in my db?' }]
    });

    console.log(JSON.stringify(result, null, 2));
    const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
    expect(allToolCalls.length).toBe(1);
    const toolCall = allToolCalls[0];
    expect(toolCall?.toolName).toBe('getTablesAndInstanceInfo');
  });
});
