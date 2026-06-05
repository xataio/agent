import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';
import { ExpectStatic } from 'vitest';
import { EVAL_REPLAY_FILE_NAME } from './consts';
import {
  EvalFailureClassification,
  EvalReplayManifest,
  EvalToolCall,
  EvalTraceMetadata,
  evalReplayManifestSchema
} from './schemas';
import { ensureTraceFolderExistsExpect } from './test-id';

type GenerateTextResponse = Awaited<ReturnType<typeof generateText>>;

const MAX_PREVIEW_LENGTH = 1000;

const preview = (value: unknown) => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (!serialized) {
    return undefined;
  }
  return serialized.length > MAX_PREVIEW_LENGTH ? `${serialized.slice(0, MAX_PREVIEW_LENGTH)}...` : serialized;
};

const toolResultToHuman = (toolResult: any) => {
  return `
${toolResult.toolName} with args: ${JSON.stringify(toolResult.args)}

Tool Result: ${toolResult.result}
`;
};

export const stepToHuman = (step: GenerateTextResponse['steps'][0]) => {
  return `
${step.text}
${step.toolResults.map(toolResultToHuman).join('\n\n')}
`;
};

const parseRequestBody = (response: GenerateTextResponse) => {
  const requestBody = response.request.body;
  if (!requestBody) {
    throw new Error('No request body found in response');
  }
  return JSON.parse(requestBody);
};

const getSystemPromptFromResponse = (response: GenerateTextResponse) => {
  const body = parseRequestBody(response);
  return body.system[0].text;
};

const getUserPromptFromResponse = (response: GenerateTextResponse) => {
  const body = parseRequestBody(response);
  return body.messages[0].content[0].text;
};

const parseRequestBodySafe = (response: Pick<GenerateTextResponse, 'request'>) => {
  try {
    if (!response.request.body) {
      return { parsed: undefined, error: 'No request body found in response' };
    }
    return { parsed: JSON.parse(response.request.body), error: undefined };
  } catch (error) {
    return { parsed: undefined, error: error instanceof Error ? error.message : String(error) };
  }
};

const getPromptText = (body: any, field: 'system' | 'messages') => {
  if (field === 'system') {
    return body?.system?.[0]?.text;
  }
  return body?.messages?.[0]?.content?.[0]?.text;
};

const normalizeToolCalls = (response: Pick<GenerateTextResponse, 'steps'>): EvalToolCall[] => {
  return response.steps.flatMap((step, stepIndex) => {
    const resultsById = new Map((step.toolResults ?? []).map((result: any) => [result.toolCallId, result]));
    return (step.toolCalls ?? []).map((toolCall: any) => {
      const toolResult = resultsById.get(toolCall.toolCallId);
      const error = toolResult?.error ?? toolResult?.result?.error;
      return {
        step: stepIndex + 1,
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolCall.args,
        hasResult: Boolean(toolResult),
        resultPreview: preview(toolResult?.result),
        error: error ? preview(error) : undefined
      };
    });
  });
};

export const buildReplayManifest = ({
  id,
  response,
  metadata = {}
}: {
  id: string;
  response: Pick<GenerateTextResponse, 'request' | 'steps' | 'text'>;
  metadata?: EvalTraceMetadata;
}): EvalReplayManifest => {
  const { parsed: requestBody, error: requestParseError } = parseRequestBodySafe(response);
  const toolCalls = normalizeToolCalls(response);
  const observedToolCalls = toolCalls.map((toolCall) => toolCall.toolName);
  const expectedToolCalls = metadata.toolPolicy?.expectedToolCalls ?? [];
  const missingExpectedToolCalls = expectedToolCalls.filter((toolName) => !observedToolCalls.includes(toolName));
  const unexpectedToolCalls =
    metadata.toolPolicy?.allowOtherTools === false
      ? observedToolCalls.filter((toolName) => !expectedToolCalls.includes(toolName))
      : [];
  const toolErrors = toolCalls.filter((toolCall) => toolCall.error);

  const classifications: EvalFailureClassification[] = [];
  if (requestParseError) classifications.push('malformed-request');
  if (!getPromptText(requestBody, 'system')) classifications.push('missing-system-prompt');
  if (!getPromptText(requestBody, 'messages')) classifications.push('missing-user-prompt');
  if (missingExpectedToolCalls.length > 0) classifications.push('missing-expected-tool');
  if (unexpectedToolCalls.length > 0) classifications.push('unexpected-tool-call');
  if (toolErrors.length > 0) classifications.push('tool-error');
  if (toolCalls.some((toolCall) => !toolCall.hasResult)) classifications.push('no-tool-result');
  if (!response.text.trim()) classifications.push('empty-final-answer');

  const manifest = {
    schemaVersion: 1,
    id,
    metadata,
    provider: {
      model: requestBody?.model,
      requestBodyCaptured: Boolean(response.request.body)
    },
    prompts: {
      system: getPromptText(requestBody, 'system'),
      user: getPromptText(requestBody, 'messages')
    },
    steps: response.steps.map((step, index) => ({
      index: index + 1,
      text: step.text,
      toolCalls: toolCalls.filter((toolCall) => toolCall.step === index + 1)
    })),
    finalAnswer: response.text,
    diagnostics: {
      classifications,
      expectedToolCalls,
      observedToolCalls,
      missingExpectedToolCalls,
      unexpectedToolCalls,
      toolErrors
    }
  } satisfies EvalReplayManifest;

  return evalReplayManifestSchema.parse(manifest);
};

export const traceVercelAiResponse = (
  response: GenerateTextResponse,
  expect: ExpectStatic,
  metadata: EvalTraceMetadata = {}
) => {
  const traceFolder = ensureTraceFolderExistsExpect(expect);
  const humanTraceFile = path.join(traceFolder, 'human.txt');
  const humanTrace = `
System Prompt: ${getSystemPromptFromResponse(response)}
--------
User Prompt: ${getUserPromptFromResponse(response)}
--------
${response.steps.map((step, index) => `Step: ${index + 1}\n\n${stepToHuman(step)}`).join('--------\n\n')}
`;
  fs.writeFileSync(humanTraceFile, humanTrace);

  const responseJson = path.join(traceFolder, 'response.json');
  fs.writeFileSync(responseJson, JSON.stringify(response, null, 2));

  const replayManifest = buildReplayManifest({
    id: expect.getState().currentTestName ?? 'unknown',
    response,
    metadata
  });
  const replayJson = path.join(traceFolder, EVAL_REPLAY_FILE_NAME);
  fs.writeFileSync(replayJson, JSON.stringify(replayManifest, null, 2));
};
