import { AttributeValue } from '@opentelemetry/api';
import {
  CoreMessage,
  DeepPartial,
  generateObject,
  GenerateObjectResult,
  generateText,
  GenerateTextResult,
  LanguageModel,
  Message,
  ProviderMetadata,
  Schema,
  Tool as SDKTool,
  tool as sdkTool,
  ToolSet as SDKToolSet,
  smoothStream,
  streamObject,
  StreamObjectResult,
  streamText,
  StreamTextOnChunkCallback,
  StreamTextOnErrorCallback,
  StreamTextOnFinishCallback,
  StreamTextOnStepFinishCallback
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

type ModelSettings = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  seed?: number;
  maxRetries?: number;
  abortSignal?: AbortSignal;
};

type StreamTextOptions<DEPS> = PromptOptions &
  Telemetry & {
    model?: LanguageModel | string;
    modelSettings?: ModelSettings;
    deps?: DEPS;
    maxSteps?: number;
    onChunk?: StreamTextOnChunkCallback<SDKToolSet>;
    onError?: StreamTextOnErrorCallback;
    onFinish?: StreamTextOnFinishCallback<SDKToolSet>;
    onStepFinish?: StreamTextOnStepFinishCallback<SDKToolSet>;
    experimental_providerMetadata?: ProviderMetadata;
  };

type StreamResult = Awaited<ReturnType<typeof streamText>>;

type GenerateTextOptions<DEPS> = PromptOptions &
  Telemetry & {
    model?: LanguageModel | string;
    modelSettings?: ModelSettings;
    deps?: DEPS;
    maxSteps?: number;
  };

type GenerateObjectOptions<DEPS, OBJECT> = PromptOptions &
  Telemetry & {
    model?: LanguageModel | string;
    modelSettings?: ModelSettings;
    deps?: DEPS;
    maxSteps?: number;
    schema: z.Schema<OBJECT, z.ZodTypeDef, any>;
    schemaName?: string;
    schemaDescription?: string;
    mode?: 'auto' | 'json' | 'tool';
  };

type StreamObjectOptions<DEPS, SCHEMA> = PromptOptions &
  Telemetry & {
    model?: LanguageModel | string;
    modelSettings?: ModelSettings;
    deps?: DEPS;
    maxSteps?: number;
    schema: z.Schema<SCHEMA, z.ZodTypeDef, any> | Schema<SCHEMA>;
    schemaName?: string;
    schemaDescription?: string;
    mode?: 'auto' | 'json' | 'tool';
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
    toolsets
  }: {
    baseModel?: LanguageModel | string;
    providerRegistry?: ProviderRegistry | (() => Promise<ProviderRegistry>);
    metadata?: Record<string, AttributeValue>;
    systemPrompt?: Prompt<DEPS> | Prompt<DEPS>[];
    toolsets?: ToolSet<DEPS> | ToolSet<DEPS>[];
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
    if (toolsets) {
      if (Array.isArray(toolsets)) {
        this.#toolSets.push(...toolsets);
      } else {
        this.#toolSets.push(toolsets);
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

  async getTools(deps?: DEPS): Promise<SDKToolSet> {
    const { tools } = await this.getToolsWithPrompt(deps);
    return tools;
  }

  private async getToolsWithPrompt(deps?: DEPS): Promise<{ tools: SDKToolSet; systemPrompts: Prompt<DEPS>[] }> {
    const systemPrompts: Prompt<DEPS>[] = [];
    const toolsetTools: Record<string, Tool<DEPS>> = (
      await Promise.all(
        this.#toolSets.map(async (toolSet) => {
          if (toolSet.active && !toolSet.active(deps)) {
            return {};
          }

          const tools = typeof toolSet.tools !== 'function' ? toolSet.tools : deps ? await toolSet.tools(deps) : {};
          if (toolSet.systemPrompt && Object.keys(tools).length > 0) {
            systemPrompts.push(toolSet.systemPrompt);
          }
          return tools;
        })
      )
    ).reduce((acc: Record<string, Tool<DEPS>>, tools: Record<string, Tool<DEPS>>) => {
      return { ...acc, ...tools };
    }, {});

    const allTools = { ...toolsetTools, ...this.#tools };
    if (!deps) {
      return {
        systemPrompts,
        tools: Object.fromEntries(
          Object.entries(allTools)
            .filter(([_, t]) => t.type !== 'function-deps')
            .map(([key, t]) => [key, t as SDKTool])
        )
      };
    }

    return {
      systemPrompts,
      tools: Object.fromEntries(
        Object.entries(allTools)
          .map(([key, t]) => [key, toSDKTool(t, deps)] as [string, SDKTool | null])
          .filter(([, tool]) => tool !== null)
      ) as SDKToolSet
    };
  }

  private getSystemPrompt(deps?: DEPS, system?: string, toolSystemPrompts?: Prompt<DEPS>[]) {
    const systemPrompts = [generatePrompt(this.#systemPrompt, deps)];
    if (system) {
      systemPrompts.push(system);
    }
    if (toolSystemPrompts) {
      const toolPrompts = generatePrompt(toolSystemPrompts, deps);
      systemPrompts.push(toolPrompts);
    }
    return joinPrompts(systemPrompts);
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
  async streamText(options: StreamTextOptions<DEPS>): Promise<StreamResult> {
    const {
      model,
      modelSettings,
      deps,
      system,
      prompt,
      messages,
      metadata,
      maxSteps,
      onChunk,
      onError,
      onFinish,
      onStepFinish
    } = options;

    const { tools, systemPrompts: toolSystemPrompts } = await this.getToolsWithPrompt(deps);
    const systemPrompt = this.getSystemPrompt(deps, system, toolSystemPrompts);
    const llm = await this.getModel(model);
    const telemetry = this.getTelemetryConfig(metadata);

    return streamText({
      model: llm,
      ...modelSettings,
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

  async generateText<OUTPUT>(options: GenerateTextOptions<DEPS>): Promise<GenerateTextResult<SDKToolSet, OUTPUT>> {
    const { model, modelSettings, deps, system, prompt, messages, metadata, maxSteps } = options;
    const { tools, systemPrompts: toolSystemPrompts } = await this.getToolsWithPrompt(deps);
    const systemPrompt = this.getSystemPrompt(deps, system, toolSystemPrompts);
    const llm = await this.getModel(model);
    const telemetry = this.getTelemetryConfig(metadata);

    return generateText({
      model: llm,
      ...modelSettings,
      system: systemPrompt,
      prompt,
      messages,
      maxSteps,
      tools,
      experimental_telemetry: telemetry
    });
  }

  async generateObject<OBJECT>(options: GenerateObjectOptions<DEPS, OBJECT>): Promise<GenerateObjectResult<OBJECT>> {
    const {
      model,
      modelSettings,
      deps,
      system,
      prompt,
      messages,
      metadata,
      schema,
      schemaName,
      schemaDescription,
      mode
    } = options;
    const { systemPrompts: toolSystemPrompts } = await this.getToolsWithPrompt(deps);
    const systemPrompt = this.getSystemPrompt(deps, system, toolSystemPrompts);
    const llm = await this.getModel(model);
    const telemetry = this.getTelemetryConfig(metadata);

    return generateObject({
      model: llm,
      ...modelSettings,
      system: systemPrompt,
      messages,
      prompt,
      schema: schema,
      schemaName,
      schemaDescription,
      mode,
      experimental_telemetry: telemetry
    });
  }

  async streamObject<OBJECT>(
    options: StreamObjectOptions<DEPS, OBJECT> & {
      output?: 'object' | undefined;
    }
  ): Promise<StreamObjectResult<DeepPartial<OBJECT>, OBJECT, never>>;
  async streamObject<ELEMENT>(
    options: StreamObjectOptions<DEPS, ELEMENT> & {
      output: 'array';
    }
  ): Promise<StreamObjectResult<Array<ELEMENT>, Array<ELEMENT>, AsyncIterable<ELEMENT> & ReadableStream<ELEMENT>>>;

  async streamObject<OBJECT>(
    options: StreamObjectOptions<DEPS, OBJECT> & { output?: 'object' }
  ): Promise<StreamObjectResult<DeepPartial<OBJECT>, OBJECT, never>>;
  async streamObject<ELEMENT>(
    options: StreamObjectOptions<DEPS, Array<ELEMENT>> & { output: 'array' }
  ): Promise<StreamObjectResult<Array<ELEMENT>, Array<ELEMENT>, AsyncIterable<ELEMENT> & ReadableStream<ELEMENT>>>;
  async streamObject<SCHEMA, PARTIAL, RESULT, ELEMENT_STREAM>(
    options: StreamObjectOptions<DEPS, SCHEMA> & { output?: 'object' | 'array' }
  ): Promise<StreamObjectResult<PARTIAL, RESULT, ELEMENT_STREAM>> {
    const {
      model,
      output = 'object',
      modelSettings,
      deps,
      system,
      prompt,
      messages,
      metadata,
      schema,
      schemaName,
      schemaDescription,
      mode
    } = options;
    const { systemPrompts: toolSystemPrompts } = await this.getToolsWithPrompt(deps);
    const systemPrompt = this.getSystemPrompt(deps, system, toolSystemPrompts);
    const llm = await this.getModel(model);
    const telemetry = this.getTelemetryConfig(metadata);

    return streamObject({
      model: llm,
      output: output as any,
      ...modelSettings,
      system: systemPrompt,
      messages,
      prompt,
      schema,
      schemaName,
      schemaDescription,
      mode,
      experimental_telemetry: telemetry
    }) as unknown as StreamObjectResult<PARTIAL, RESULT, ELEMENT_STREAM>;
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

export type ToolSet<DEPS = any> = {
  active?: (deps?: DEPS) => boolean;
  systemPrompt?: Prompt<DEPS>;
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
