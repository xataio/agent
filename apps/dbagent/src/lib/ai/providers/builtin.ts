import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '~/lib/env/server';

import { Model, ProviderRegistry } from './types';
import { combineRegistries, createModel, createRegistryFromModels } from './utils';

// ─── OpenAI ──────────────────────────────────────────────────────────────────

const OPENAI_EXCLUDED_KEYWORDS = [
  'embedding',
  'whisper',
  'tts',
  'dall-e',
  'moderation',
  'realtime',
  'audio',
  'instruct'
];
const OPENAI_CHAT_PATTERN = /^(gpt-|o\d|chatgpt-)/;

function isOpenAIChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (OPENAI_EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  return OPENAI_CHAT_PATTERN.test(lower);
}

async function createOpenAIRegistry(): Promise<ProviderRegistry> {
  const openaiProvider = createOpenAI({ baseURL: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY });
  const baseUrl = (env.OPENAI_BASE_URL ?? 'https://api.openai.com').replace(/\/$/, '');

  const response = await fetch(`${baseUrl}/v1/models`, {
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }
  });
  if (!response.ok) throw new Error(`OpenAI models API error: ${response.status} ${response.statusText}`);

  const data = (await response.json()) as { data: Array<{ id: string }> };
  const models: Model[] = data.data
    .filter((m) => isOpenAIChatModel(m.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => createModel({ id: `openai:${m.id}`, name: m.id }, () => openaiProvider.languageModel(m.id)));

  if (models.length === 0) throw new Error('OpenAI returned no usable chat models');
  return createRegistryFromModels({ models });
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function createAnthropicRegistry(): Promise<ProviderRegistry> {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01'
    }
  });
  if (!response.ok) throw new Error(`Anthropic models API error: ${response.status} ${response.statusText}`);

  const data = (await response.json()) as { data: Array<{ id: string; display_name: string }> };
  const models: Model[] = data.data.map((m) =>
    createModel({ id: `anthropic:${m.id}`, name: m.display_name }, () => anthropic.languageModel(m.id))
  );

  if (models.length === 0) throw new Error('Anthropic returned no usable models');
  return createRegistryFromModels({ models });
}

// ─── Google ──────────────────────────────────────────────────────────────────

async function createGoogleRegistry(): Promise<ProviderRegistry> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}`
  );
  if (!response.ok) throw new Error(`Google models API error: ${response.status} ${response.statusText}`);

  const data = (await response.json()) as {
    models: Array<{ name: string; displayName: string; supportedGenerationMethods: string[] }>;
  };
  const models: Model[] = data.models
    .filter((m) => m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => {
      const modelId = m.name.replace('models/', '');
      return createModel({ id: `google:${modelId}`, name: m.displayName }, () => google.languageModel(modelId));
    });

  if (models.length === 0) throw new Error('Google returned no usable chat models');
  return createRegistryFromModels({ models });
}

// ─── DeepSeek ────────────────────────────────────────────────────────────────

async function createDeepSeekRegistry(): Promise<ProviderRegistry> {
  const response = await fetch('https://api.deepseek.com/models', {
    headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` }
  });
  if (!response.ok) throw new Error(`DeepSeek models API error: ${response.status} ${response.statusText}`);

  const data = (await response.json()) as { data: Array<{ id: string }> };
  const models: Model[] = data.data.map((m) =>
    createModel({ id: `deepseek:${m.id}`, name: m.id }, () => deepseek.languageModel(m.id))
  );

  if (models.length === 0) throw new Error('DeepSeek returned no usable models');
  return createRegistryFromModels({ models });
}

// ─── Aliases ─────────────────────────────────────────────────────────────────

// Patterns that indicate a lightweight/cheap model suitable for title/summary tasks
const SMALL_MODEL_PATTERNS = ['mini', 'flash', 'haiku', 'lite', 'nano'];

function findSmallModel(models: Model[]): Model | undefined {
  return models.find((m) => {
    const lower = m.info().id.toLowerCase();
    return SMALL_MODEL_PATTERNS.some((p) => lower.includes(p));
  });
}

// ─── Combined builtin registry ───────────────────────────────────────────────

export async function getBuiltinProviderRegistry(): Promise<ProviderRegistry> {
  const providers: Array<[string, () => Promise<ProviderRegistry>]> = [];

  if (env.OPENAI_API_KEY) providers.push(['OpenAI', createOpenAIRegistry]);
  if (env.ANTHROPIC_API_KEY) providers.push(['Anthropic', createAnthropicRegistry]);
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) providers.push(['Google', createGoogleRegistry]);
  if (env.DEEPSEEK_API_KEY) providers.push(['DeepSeek', createDeepSeekRegistry]);

  if (providers.length === 0) {
    throw new Error('No providers enabled. Please configure at least one API key');
  }

  const results = await Promise.allSettled(providers.map(([, fn]) => fn()));

  const registries: ProviderRegistry[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    if (result.status === 'fulfilled') {
      registries.push(result.value);
    } else {
      console.warn(`[builtin] ${providers[i]![0]} registry failed:`, result.reason);
    }
  }

  if (registries.length === 0) {
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => String(r.reason))
      .join('; ');
    throw new Error(`All provider registries failed to load: ${errors}`);
  }

  // Combine all provider registries into one, then build aliases over the full model list
  const combined = combineRegistries(registries);
  const allModels = combined.listLanguageModels();

  const defaultModel = allModels[0]!;
  const smallModel = findSmallModel(allModels) ?? defaultModel;

  const aliases: Record<string, string> = {
    chat: defaultModel.info().id,
    title: smallModel.info().id,
    summary: smallModel.info().id
  };

  return createRegistryFromModels({ models: allModels, aliases, defaultModel });
}
