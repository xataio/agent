import { z } from 'zod';
import { commonModel } from '~/lib/ai/agent';
import { sheetPrompt, updateDocumentPrompt } from '~/lib/ai/prompts';
import { createDocumentHandler } from '../server-document-handler';

// Note: To mock createDocumentHandler in tests, you can use a jest mock or a similar mocking library.
// For example, you can define a mock implementation like this:
// jest.mock('~/components/chat/artifacts/server', () => ({
//   createDocumentHandler: jest.fn().mockReturnValue(jest.fn())
// }));

export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = await commonModel.streamObject({
      system: sheetPrompt,
      metadata: {
        tags: ['artifact', 'sheet', 'create']
      },
      prompt: title,
      schema: z.object({
        csv: z.string().describe('CSV data')
      })
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.writeData({
            type: 'sheet-delta',
            content: csv
          });

          draftContent = csv;
        }
      }
    }

    dataStream.writeData({
      type: 'sheet-delta',
      content: draftContent
    });

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = await commonModel.streamObject({
      system: updateDocumentPrompt(document.content, 'sheet'),
      prompt: description,
      schema: z.object({
        csv: z.string()
      }),
      metadata: {
        tags: ['artifact', 'sheet', 'update']
      }
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.writeData({
            type: 'sheet-delta',
            content: csv
          });

          draftContent = csv;
        }
      }
    }

    return draftContent;
  }
});
