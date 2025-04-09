import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { customProvider, LanguageModelV1 } from 'ai';
import { Model } from '../db/schema';

const baseModels = {
  'gpt-4o': openai('gpt-4o'),
  'gpt-4-turbo': openai('gpt-4-turbo'),
  'deepseek-chat': deepseek('deepseek-chat'),
  'claude-3-5-haiku': anthropic('claude-3-5-haiku-20241022'),
  'claude-3-7-sonnet': anthropic('claude-3-7-sonnet-20250219'),
  'gemini-2-0-flash': google('gemini-2.0-flash'),
  'gemini-2-0-flash-lite': google('gemini-2.0-flash-lite')
} satisfies Record<Model, LanguageModelV1>;

export const modelNames = {
  'gpt-4o': 'GPT-4o',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'deepseek-chat': 'DeepSeek Chat',
  'claude-3-5-haiku': 'Claude 3.5 Haiku',
  'claude-3-7-sonnet': 'Claude 3.7 Sonnet',
  'gemini-2-0-flash': 'Gemini 2.0 Flash',
  'gemini-2-0-flash-lite': 'Gemini 2.0 Flash Lite'
} satisfies Record<Model, string>;

export const modelProvider = customProvider({
  languageModels: {
    ...baseModels,

    // Custom models
    'title-model': openai('gpt-4o'),
    'artifact-model': openai('gpt-4o')
  }
});
