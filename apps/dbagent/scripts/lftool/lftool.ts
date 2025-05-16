// Import env configuration first
import { evalFunction } from '../eval/simple';
import './env';

import { WriteStream } from 'fs';
import { ApiTraceWithDetails, ApiUtilsMetaResponse, Langfuse } from 'langfuse';
import { z } from 'zod';

import { command, number, option, optional, positional, restPositionals, run, string, subcommands } from 'cmd-ts';
import { promises as fs } from 'fs';
import { FileHandle } from 'fs/promises';
import { turnFromResponse } from '~/evals/lib/chat-runner';
import { setEvalModel } from '~/evals/lib/llmcheck';
import { AgentModelDeps, chatModel, getAgentMockDeps, getModelInstance } from '~/lib/ai/agent';
import { Tool } from '~/lib/ai/model';

const envSchema = z.object({
  LANGFUSE_HOST: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_DEBUG: z.string(z.enum(['true', 'false'])).default('false')
});

/* eslint-disable-next-line no-process-env */
const env = envSchema.parse(process.env);

function getLangfuse(): Langfuse {
  return new Langfuse({
    baseUrl: env.LANGFUSE_HOST,
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY
  });
}

const cmdSessionsList = command({
  name: 'list',
  args: {
    limit: option({ type: optional(number), long: 'limit', short: 'l' })
  },
  handler: async ({ limit }) => {
    const langfuse = getLangfuse();
    const sessions = await langfuse.fetchSessions({
      limit: limit
    });
    console.log(sessions.data);
  }
});

const cmdSessionDownload = command({
  name: 'dlsession',
  args: {
    sessionIds: restPositionals({ type: string }),
    output: option({ type: optional(string), long: 'output', short: 'o' })
  },
  handler: async ({ sessionIds, output }) => {
    const langfuse = getLangfuse();

    const sessionPages = async function* (sessionId: string, data: ApiTraceWithDetails[], meta: ApiUtilsMetaResponse) {
      while (true) {
        yield data;
        if (meta.page == meta.totalPages) {
          break;
        }

        ({ data, meta } = await langfuse.fetchTraces({
          sessionId: sessionId,
          limit: 20,
          page: meta.page + 1
        }));
      }
    };

    const sessionItems = async function* (sessionId: string, data: ApiTraceWithDetails[], meta: ApiUtilsMetaResponse) {
      for await (const page of sessionPages(sessionId, data, meta)) {
        for (const item of page) {
          yield item;
        }
      }
    };

    const sessions = async function* () {
      let ids = sessionIds;
      if (ids.length == 0) {
        const sessions = await langfuse.fetchSessions({
          limit: 20
        });
        ids = sessions.data.map((session) => session.id);
      }

      for (const sessionId of ids) {
        const { data, meta } = await langfuse.fetchTraces({
          sessionId: sessionId,
          limit: 20
        });

        yield {
          sessionId: sessionId,
          items: sessionItems(sessionId, data, meta)
        };
      }
    };

    const header = {
      type: 'langfuse-session',
      version: 1
    };

    let file: FileHandle | undefined;
    if (output) {
      file = await fs.open(output, 'w');
    }

    const outputStream: WriteStream = (file ? file.createWriteStream() : process.stdout) as WriteStream;
    try {
      outputStream.write(JSON.stringify(header));
      outputStream.write('\n');

      for await (const { sessionId, items } of sessions()) {
        outputStream.write(`{"sessionId": "${sessionId}", items:[`);
        let count = 0;
        for await (const item of items) {
          if (count > 0) outputStream.write(', ');
          outputStream.write(JSON.stringify(item));
          count++;
        }
        outputStream.write(']}\n');
      }
    } finally {
      outputStream.end();
      await file?.close();
    }
  }
});

const cmdSessions = subcommands({
  name: 'session',
  cmds: {
    list: cmdSessionsList,
    download: cmdSessionDownload
  }
});

const cmdDatasetsList = command({
  name: 'list',
  args: {},
  handler: async () => {
    const langfuse = getLangfuse();
    const url = `${langfuse.baseUrl}/api/public/v2/datasets`;

    const fetchDatasets = async ({ limit = 50, page = 1 }: { limit?: number; page?: number }) => {
      const params = new URLSearchParams({ limit: limit.toString(), page: page.toString() });
      const response = await langfuse.fetch(
        `${url}?${params.toString()}`,
        langfuse._getFetchOptions({
          method: 'GET'
        })
      );
      if (response.status !== 200) {
        throw new Error(`Failed to fetch datasets: ${response.status}`);
      }
      return await response.json();
    };

    const datasetPages = async function* () {
      let { data, meta } = await fetchDatasets({});

      while (true) {
        yield data;
        if (meta.page == meta.totalPages) {
          break;
        }

        ({ data, meta } = await fetchDatasets({
          limit: 50,
          page: meta.page + 1
        }));
      }
    };

    for await (const page of datasetPages()) {
      for (const item of page) {
        console.log(item);
      }
    }
  }
});

const cmdDatasetDownload = command({
  name: 'download',
  args: {
    datasetName: positional({ type: string }),
    output: option({ type: optional(string), long: 'output', short: 'o' })
  },
  handler: async ({ datasetName: datasetId, output }) => {
    const langfuse = getLangfuse();
    const response = await langfuse.getDataset(datasetId);
    const { items, ...rest } = response;
    const header = {
      type: 'langfuse-dataset',
      version: 1,
      ...rest
    };

    let file: FileHandle | undefined;
    if (output) {
      file = await fs.open(output, 'w');
    }
    const outputStream: WriteStream = (file ? file.createWriteStream() : process.stdout) as WriteStream;
    try {
      outputStream.write(JSON.stringify(header));
      outputStream.write('\n');
      for (const item of items) {
        outputStream.write(JSON.stringify(item));
        outputStream.write('\n');
      }
    } finally {
      outputStream.end();
      await file?.close();
    }
  }
});

const cmdDatasetEval = command({
  name: 'eval',
  args: {
    datasetName: positional({ type: string, displayName: 'dataset-name' })
  },
  handler: async ({ datasetName }) => {
    const langfuse = getLangfuse();
    const response = await langfuse.getDataset(datasetName);
    const { items } = response;

    setEvalModel(await getModelInstance(process.env.EVAL_MODEL ?? 'chat'));

    const runName = `${datasetName}-${new Date().toISOString()}`;
    const model = process.env.CHAT_MODEL;

    for (const item of items) {
      type ToolCall = { input: any; output: any };
      type ToolCallTable = Record<string, ToolCall[]>;
      type ToolCallItem = ToolCall & { toolName: string };

      const trace = langfuse.trace({
        name: runName
      });

      const toolCalls: ToolCallTable = (item.metadata as any).toolCalls.reduce(
        (acc: ToolCallTable, toolCall: ToolCallItem) => {
          acc[toolCall.toolName] = [...(acc[toolCall.toolName] || []), toolCall];
          return acc;
        },
        {} as ToolCallTable
      );
      console.log(toolCalls);

      const inputEqual = (a: any, b: any) => {
        return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => a[key] === b[key]);
      };

      const messages = (item.input as any).messages;
      const response = await chatModel.generateText({
        model,
        maxSteps: 20,
        deps: getAgentMockDeps({}),
        messages,
        tools: (tools: Record<string, Tool<AgentModelDeps>>) => {
          for (const [name, toolCallVariants] of Object.entries(toolCalls)) {
            const tool = tools[name];
            if (!tool) {
              console.log(`Tool ${name} not found`);
              continue;
            }
            tool.execute = async (input: any) => {
              console.log(`tool call: ${name}(${JSON.stringify(input)})`);

              const toolCall = toolCallVariants.find((toolCall) => inputEqual(toolCall.input, input));
              if (!toolCall) {
                console.log(`Error: tool call ${name} for input ${JSON.stringify(input)} not found`);
                return null;
              }

              const output = toolCall.output;
              console.log(`  => ${name}: ${JSON.stringify(output)}`);
              return output;
            };
          }
          return tools;
        }
      });

      // find prompt in messages
      let prompt = '';
      for (const message of messages) {
        if (message.role === 'user') {
          prompt = message.content;
          break;
        }
      }

      const turn = {
        ...turnFromResponse(prompt, response),
        expectedOutput: item.expectedOutput as any
      };
      const evals = await evalFunction(langfuse, turn);
      console.log(evals);

      const runMetadata = {
        output: turn.output,
        evals
      };

      await item.link(trace, runName, {
        metadata: runMetadata
      });

      // try to set scores
      try {
        for (const [metricName, measure] of Object.entries(evals)) {
          const value = measure.type === 'bool' ? (measure.success ? 'PASS' : 'FAIL') : measure.score;
          console.log(`${metricName}: ${value}`);

          langfuse.score({
            name: metricName,
            value,
            traceId: trace.id
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    await langfuse.flushAsync();
  }
});

async function* traceSpans(langfuse: Langfuse, traceId: string) {
  const pages = async function* () {
    let { data, meta } = await langfuse.fetchObservations({ traceId, type: 'SPAN' });
    while (true) {
      yield data;
      if (meta.page == meta.totalPages) {
        break;
      }

      ({ data, meta } = await langfuse.fetchObservations({ traceId, type: 'SPAN', page: meta.page + 1 }));
    }
  };

  for await (const page of pages()) {
    for (const item of page) {
      yield item;
    }
  }
}

async function* traceToolCalls(langfuse: Langfuse, traceId: string) {
  const spans = traceSpans(langfuse, traceId);
  for await (const span of spans) {
    if (!span.name || !span.name || !span.name.startsWith('ai.toolCall')) {
      continue;
    }

    const toolName = span.name.split(' ')[1];
    const { input, output } = span;
    yield { toolName, input, output };
  }
}

const cmdDatasetPromote = command({
  name: 'enhance',
  args: {
    datasetName: positional({ type: string, displayName: 'dataset-name' }),
    staging: option({ type: optional(string), long: 'staging', short: 's' })
  },
  handler: async ({ datasetName, staging }) => {
    const langfuse = getLangfuse();
    const response = await langfuse.getDataset(staging || 'staging');
    const { items } = response;

    // make sure the target dataset exists
    await langfuse.createDataset({ name: datasetName });
    for (const item of items) {
      const { sourceTraceId } = item;
      if (!sourceTraceId) {
        console.log(`Skipping item ${item.id} because it has no sourceTraceId`);
        continue;
      }

      const toolCalls = [];
      for await (const toolCall of traceToolCalls(langfuse, sourceTraceId)) {
        toolCalls.push(toolCall);
      }

      const metadata = {
        ...(item.metadata ?? {}),
        toolCalls
      };

      await langfuse.createDatasetItem({
        id: item.id + '-enhanced',
        datasetName,
        expectedOutput: item.expectedOutput,
        input: item.input,
        metadata,
        sourceTraceId: item.id
      });
    }
  }
});

const cmdDatasets = subcommands({
  name: 'datasets',
  cmds: {
    list: cmdDatasetsList,
    download: cmdDatasetDownload,
    promote: cmdDatasetPromote,
    eval: cmdDatasetEval
  }
});

const tool = subcommands({
  name: 'tool',
  cmds: {
    session: cmdSessions,
    dataset: cmdDatasets,
    ds: cmdDatasets
  }
});

run(tool, process.argv.slice(2)).catch(console.error);
