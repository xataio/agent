import { AttributeValue } from '@opentelemetry/api';
import {
  CoreMessage,
  DataStreamOptions,
  DataStreamWriter,
  generateText,
  GenerateTextResult,
  LanguageModel,
  Message,
  ProviderMetadata,
  Tool as SDKTool,
  tool as sdkTool,
  ToolSet as SDKToolSet,
  smoothStream,
  streamText,
  StreamTextOnChunkCallback,
  StreamTextOnErrorCallback,
  StreamTextOnFinishCallback,
  StreamTextOnStepFinishCallback,
  TextStreamPart
} from 'ai';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type PromptOptions = {
  system?: string;
  prompt?: string;
  messages?: Array<CoreMessage> | Array<Omit<Message, 'id'>>;
};

interface Telemetry {
  metadata?: Record<string, AttributeValue>;
}

type StreamTextOptions<DEPS> = PromptOptions &
  Telemetry & {
    model?: LanguageModel | string;
    deps?: DEPS;
    maxSteps?: number;
    onChunk?: StreamTextOnChunkCallback<SDKToolSet>;
    onError?: StreamTextOnErrorCallback;
    onFinish?: StreamTextOnFinishCallback<SDKToolSet>;
    onStepFinish?: StreamTextOnStepFinishCallback<SDKToolSet>;
    experimental_providerMetadata?: ProviderMetadata;
  };

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

interface StreamResult {
  readonly fullStream: AsyncIterableStream<TextStreamPart<SDKToolSet>>;
  consumeStream(options?: { onError?: (error: unknown) => void }): Promise<void>;
  mergeIntoDataStream(dataStream: DataStreamWriter, options?: DataStreamOptions): void;
}

type GenerateTextOptions<DEPS> = PromptOptions &
  Telemetry & {
    model?: LanguageModel | string;
    deps?: DEPS;
    maxSteps?: number;
  };

interface Model<DEPS = any> {
  streamText(options: StreamTextOptions<DEPS>): Promise<StreamResult>;
  generateText<OUTPUT>(options: GenerateTextOptions<DEPS>): Promise<GenerateTextResult<SDKToolSet, OUTPUT>>;
}

export class AugmentedLanguageModel<DEPS = any> implements Model<DEPS> {
  #providerRegistry?: ProviderRegistry | (() => Promise<ProviderRegistry>);
  #baseModel?: LanguageModel | (() => Promise<LanguageModel>) | string;
  #systemPrompt: Prompt<any>[] = [];
  #tools: Record<string, Tool<DEPS>> = {};
  #toolSets: ToolSet<DEPS>[] = [];
  #metadata?: Record<string, AttributeValue>;

  constructor({
    baseModel,
    providerRegistry,
    metadata,
    systemPrompt,
    toolsSets
  }: {
    baseModel?: LanguageModel | string;
    providerRegistry?: ProviderRegistry | (() => Promise<ProviderRegistry>);
    metadata?: Record<string, AttributeValue>;
    systemPrompt?: Prompt<DEPS> | Prompt<DEPS>[];
    toolsSets?: ToolSet<DEPS> | ToolSet<DEPS>[];
  }) {
    if (!baseModel && !providerRegistry) {
      throw new Error('baseModel and providerRegistry are required.');
    }
    this.#baseModel = baseModel;
    this.#providerRegistry = providerRegistry;
    this.#metadata = metadata;
    if (systemPrompt) {
      if (Array.isArray(systemPrompt)) {
        this.#systemPrompt.push(...systemPrompt);
      } else {
        this.#systemPrompt.push(systemPrompt);
      }
    }
    if (toolsSets) {
      if (Array.isArray(toolsSets)) {
        this.#toolSets.push(...toolsSets);
      } else {
        this.#toolSets.push(toolsSets);
      }
    }
  }

  addSystemPrompt(prompt: Prompt<DEPS>) {
    this.#systemPrompt.push(prompt);
  }

  addSystemPrompts(...prompts: Prompt<DEPS>[]) {
    this.#systemPrompt.push(...prompts);
  }

  addTool(name: string, tool: Tool<DEPS>) {
    this.#tools[name] = tool;
  }

  addTools(tools: Record<string, Tool<DEPS>>) {
    Object.entries(tools).forEach(([name, tool]) => {
      this.addTool(name, tool);
    });
  }

  addToolSet(toolSet: ToolSet<DEPS>) {
    this.#toolSets.push(toolSet);
  }

  addToolSets(...toolSets: ToolSet<DEPS>[]) {
    this.#toolSets.push(...toolSets);
  }

  private async getModel(optModel?: LanguageModel | string): Promise<LanguageModel> {
    const model = optModel || this.#baseModel;
    if (typeof model === 'string') {
      const providerRegistry =
        typeof this.#providerRegistry === 'function' ? await this.#providerRegistry() : this.#providerRegistry;
      const m = providerRegistry!.languageModel(model, true);
      return m.instance();
    }
    if (typeof model === 'function') {
      const m = await model();
      return m;
    }
    return model as LanguageModel;
  }

  private async getTools(deps?: DEPS): Promise<SDKToolSet> {
    const toolsetTools: Record<string, Tool<DEPS>> = (
      await Promise.all(
        this.#toolSets.map(async (toolSet) => {
          if (toolSet.active && !toolSet.active(deps)) {
            return {};
          }
          if (typeof toolSet.tools === 'function') {
            return deps ? await toolSet.tools(deps) : {};
          }
          return toolSet.tools;
        })
      )
    ).reduce((acc: Record<string, Tool<DEPS>>, tools: Record<string, Tool<DEPS>>) => {
      return { ...acc, ...tools };
    }, {});

    const allTools = { ...toolsetTools, ...this.#tools };
    if (!deps) {
      return Object.fromEntries(
        Object.entries(allTools)
          .filter(([_, t]) => t.type !== 'function-deps')
          .map(([key, t]) => [key, t as SDKTool])
      );
    }

    return Object.fromEntries(
      Object.entries(allTools)
        .map(([key, t]) => [key, toSDKTool(t, deps)] as [string, SDKTool | null])
        .filter(([, tool]) => tool !== null)
    ) as SDKToolSet;
  }

  private getSystemPrompt(deps?: DEPS, system?: string) {
    let systemPrompt = generatePrompt(this.#systemPrompt, deps);
    if (system) {
      systemPrompt = joinPrompts([systemPrompt, system]);
    }
    return systemPrompt;
  }

  private getTelemetryConfig(metadata?: Record<string, AttributeValue>) {
    return {
      isEnabled: true,
      metadata: {
        ...this.#metadata,
        ...metadata
      }
    };
  }
  async streamText({
    model,
    deps,
    system,
    prompt,
    messages,
    maxSteps,
    onChunk,
    onError,
    onFinish,
    onStepFinish,
    metadata
  }: StreamTextOptions<DEPS>): Promise<StreamResult> {
    const systemPrompt = this.getSystemPrompt(deps, system);
    const tools: SDKToolSet = await this.getTools(deps);
    const llm = await this.getModel(model);
    const telemetry = this.getTelemetryConfig(metadata);

    console.log('systemPrompt', systemPrompt);
    console.log('prompt', prompt);
    console.log('messages', messages);
    console.log('tools', tools);

    return streamText({
      model: llm,
      system: systemPrompt,
      prompt,
      messages,
      maxSteps,
      onChunk,
      onError,
      onFinish,
      onStepFinish,
      tools,
      toolCallStreaming: true,
      experimental_telemetry: telemetry,
      experimental_transform: smoothStream({ chunking: 'word' }),
      experimental_generateMessageId: generateUUID
    });
  }

  async generateText<OUTPUT>({
    model,
    deps,
    system,
    prompt,
    messages,
    maxSteps,
    metadata
  }: GenerateTextOptions<DEPS>): Promise<GenerateTextResult<SDKToolSet, OUTPUT>> {
    const systemPrompt = this.getSystemPrompt(deps, system);
    const tools: SDKToolSet = await this.getTools(deps);
    const llm = await this.getModel(model);
    const telemetry = this.getTelemetryConfig(metadata);

    return generateText({
      model: llm,
      system: systemPrompt,
      prompt,
      messages,
      maxSteps,
      tools,
      experimental_telemetry: telemetry
    });
  }
}

type Prompt<DepsT> = StaticPrompt | PromptFunction<DepsT>;

export function generatePrompt<DEPS>(prompts: Prompt<DEPS>[], deps?: DEPS): string {
  return joinPrompts(prompts.map((p) => callPrompt(p, deps)).filter((p) => p !== ''));
}

function callPrompt<DEPS>(prompt: Prompt<DEPS>, deps?: DEPS): string {
  if (typeof prompt === 'string') {
    return prompt;
  }
  if (!deps) {
    return '';
  }
  return prompt(deps);
}

function joinPrompts(prompts: string[]): string {
  return prompts.join('\n\n');
}

type StaticPrompt = string;

type PromptFunction<DepsT> = (deps: DepsT) => string;

import { ToolExecutionOptions } from 'ai';
import { z } from 'zod';
import { ProviderRegistry } from './providers';

type ToolParameters = z.ZodTypeAny;

type Tool<DEPS = any, PARAMETERS extends ToolParameters = ToolParameters, RESULT = any> =
  | SDKTool<PARAMETERS, RESULT>
  | {
      type: 'function-deps';
      description?: string;
      parameters: PARAMETERS;
      active?: (deps?: DEPS) => boolean;
      execute: (deps: DEPS, args: z.infer<PARAMETERS>, options: ToolExecutionOptions) => PromiseLike<RESULT>;
    };

type ToolSet<DEPS = any> = {
  active?: (deps?: DEPS) => boolean;
  tools: Record<string, Tool<DEPS>> | ((deps: DEPS) => Promise<Record<string, Tool<DEPS>>>);
};

function toSDKTool<DEPS, PARAMETERS extends ToolParameters, RESULT = any>(
  tool: Tool<DEPS, PARAMETERS, RESULT>,
  deps: DEPS
): SDKTool<PARAMETERS, RESULT> | null {
  if (tool.type === 'function-deps') {
    if (tool.active && !tool.active(deps)) {
      return null;
    }

    return sdkTool({
      description: tool.description,
      parameters: tool.parameters,
      execute: (args, options) => tool.execute(deps, args, options)
    });
  }
  return tool;
}

export function tool<DEPS, PARAMETERS extends ToolParameters, RESULT = any>({
  description,
  parameters,
  execute
}: {
  description?: string;
  parameters: PARAMETERS;
  active?: (deps: DEPS) => boolean;
  execute: (deps: DEPS, args: z.infer<PARAMETERS>) => PromiseLike<RESULT>;
}): Tool<DEPS, PARAMETERS, RESULT>;
export function tool<DEPS, PARAMETERS extends ToolParameters, RESULT = any>(tool: {
  description?: string;
  parameters: PARAMETERS;
  execute: (args: z.infer<PARAMETERS>) => PromiseLike<RESULT>;
}): Tool<DEPS, PARAMETERS, RESULT>;
export function tool<DEPS, PARAMETERS extends ToolParameters, RESULT = any>(tool: {
  description?: string;
  parameters: PARAMETERS;
  active?: (deps?: DEPS) => boolean;
  execute: any;
}): Tool<DEPS, PARAMETERS, RESULT> {
  if (typeof tool.execute === 'function' && tool.execute.length === 2) {
    return {
      type: 'function-deps',
      description: tool.description,
      parameters: tool.parameters,
      active: tool.active,
      execute: tool.execute
    };
  }
  return sdkTool(tool);
}
