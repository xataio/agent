import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';
import { ExpectStatic } from 'vitest';
import { ensureTraceFolderExistsExpect } from './test-id';

type GenerateTextResponse = Awaited<ReturnType<typeof generateText>>;

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

export const traceVercelAiResponse = (response: GenerateTextResponse, expect: ExpectStatic) => {
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
};
