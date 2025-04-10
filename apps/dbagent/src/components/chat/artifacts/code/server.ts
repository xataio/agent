import { streamObject } from 'ai';
import { z } from 'zod';
import { getModelInstance } from '~/lib/ai/aidba';
import { codePrompt, updateDocumentPrompt } from '~/lib/ai/prompts';
import { createDocumentHandler } from '../server';

export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: getModelInstance('chat'),
      system: codePrompt,
      prompt: title,
      schema: z.object({
        code: z.string()
      })
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.writeData({
            type: 'code-delta',
            content: code ?? ''
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: getModelInstance('chat'),
      system: updateDocumentPrompt(document.content, 'code'),
      prompt: description,
      schema: z.object({
        code: z.string()
      })
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.writeData({
            type: 'code-delta',
            content: code ?? ''
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  }
});
