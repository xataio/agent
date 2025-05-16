import { AugmentedLanguageModel } from '~/lib/ai/model';
import { updateDocumentPrompt } from '~/lib/ai/prompts';
import { getProviderRegistry } from '~/lib/ai/providers';
import { createDocumentHandler } from '../server-document-handler';

const titleModel = new AugmentedLanguageModel({
  providerRegistry: getProviderRegistry,
  baseModel: 'title',
  systemPrompt: 'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
  metadata: {
    tags: ['artifact', 'text', 'create']
  }
});

type DocumentUpdateDeps = {
  content: string | null;
};

const documentUpdateModel = new AugmentedLanguageModel<DocumentUpdateDeps>({
  providerRegistry: getProviderRegistry,
  baseModel: 'chat',
  systemPrompt: ({ content }) => updateDocumentPrompt(content, 'text'),
  metadata: {
    tags: ['artifact', 'text', 'update']
  }
});

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = await titleModel.streamText({ prompt: title });
    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text-delta') {
        const { textDelta } = delta;

        draftContent += textDelta;

        dataStream.writeData({
          type: 'text-delta',
          content: textDelta
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = await documentUpdateModel.streamText({
      deps: { content: document.content },
      prompt: description,
      experimental_providerMetadata: {
        openai: {
          prediction: {
            type: 'content',
            content: document.content
          }
        }
      }
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text-delta') {
        const { textDelta } = delta;

        draftContent += textDelta;
        dataStream.writeData({
          type: 'text-delta',
          content: textDelta
        });
      }
    }

    return draftContent;
  }
});
