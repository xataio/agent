import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the environment variables
vi.mock('~/lib/env/server', () => ({
  env: {
    OPENAI_API_KEY: undefined,
    DEEPSEEK_API_KEY: undefined,
    ANTHROPIC_API_KEY: undefined,
    GOOGLE_GENERATIVE_AI_API_KEY: undefined,
    LITELLM_BASE_URL: undefined,
    LITELLM_API_KEY: undefined,
    OLLAMA_HOST: undefined,
    OLLAMA_HEADERS: undefined
  }
}));

async function reImportModules() {
  // Dynamically import modules to re-evaluate them with new mocks
  const { env } = await import('~/lib/env/server');
  const providers = await import('./index');
  // It's crucial to also re-import builtin if its internal state (like default models)
  // depends on env variables evaluated at module scope.
  const builtinProviders = await import('./builtin');
  return { env, providers, builtinProviders };
}

describe('AI Provider Logic', () => {
  let originalEnv: typeof import('~/lib/env/server').env;
  let currentEnv: any; // To hold the mutable mock env

  beforeEach(async () => {
    // Save original env and prepare a mutable one for tests
    const { env: actualEnv } = await import('~/lib/env/server');
    originalEnv = { ...actualEnv }; // Shallow copy
    currentEnv = actualEnv; // This is the one we'll modify

    // Reset modules to ensure clean state for each test
    // This is important because the provider registry is memoized
    vi.resetModules();

    // Re-assign the mocked env to the one we control
    vi.mock('~/lib/env/server', () => ({
      env: currentEnv
    }));
  });

  afterEach(() => {
    // Restore original env values for other tests if any
    Object.assign(currentEnv, originalEnv);
    vi.restoreAllMocks();
  });

  describe('getDefaultLanguageModel', () => {
    it('Scenario: No API keys provided - should throw if no providers are configured', async () => {
      // Explicitly set all keys to undefined
      currentEnv.OPENAI_API_KEY = undefined;
      currentEnv.DEEPSEEK_API_KEY = undefined;
      currentEnv.ANTHROPIC_API_KEY = undefined;
      currentEnv.GOOGLE_GENERATIVE_AI_API_KEY = undefined;
      currentEnv.LITELLM_BASE_URL = undefined;
      currentEnv.OLLAMA_HOST = undefined;

      const { providers } = await reImportModules();
      await expect(providers.getDefaultLanguageModel()).rejects.toThrow('No provider registry configured');
    });

    it('Scenario: No API keys for built-in, but LiteLLM is configured - should not throw and return LiteLLM model', async () => {
      currentEnv.OPENAI_API_KEY = undefined;
      currentEnv.DEEPSEEK_API_KEY = undefined;
      currentEnv.LITELLM_BASE_URL = 'http://localhost:4000';
      currentEnv.LITELLM_API_KEY = 'fake-litellm-key'; // LiteLLM needs a key

      // Mock LiteLLM provider to return a dummy model
      vi.mock('./litellm', async (importOriginal) => {
        const original = (await importOriginal()) as any;
        return {
          ...original,
          createLiteLLMProviderRegistry: vi.fn().mockResolvedValue({
            listLanguageModels: () => [
              {
                id: 'litellm/custom-model',
                info: () => ({ id: 'litellm/custom-model', name: 'LiteLLM Model', private: false })
              }
            ],
            languageModel: (id: string) => ({ id, info: () => ({ id, name: 'LiteLLM Model', private: false }) }),
            defaultLanguageModel: () => ({
              id: 'litellm/custom-model',
              info: () => ({ id: 'litellm/custom-model', name: 'LiteLLM Model', private: false })
            })
          })
        };
      });

      const { providers } = await reImportModules();
      const model = await providers.getDefaultLanguageModel();
      expect(model.info().id).toBe('litellm/custom-model');
      expect(model.info().name).toBe('LiteLLM Model');
    });

    it('Scenario: No API keys for built-in, but Ollama is configured - should not throw and return Ollama model', async () => {
      currentEnv.OPENAI_API_KEY = undefined;
      currentEnv.DEEPSEEK_API_KEY = undefined;
      currentEnv.OLLAMA_HOST = 'http://localhost:11434';

      vi.mock('./ollama', async (importOriginal) => {
        const original = (await importOriginal()) as any;
        return {
          ...original,
          createOllamaProviderRegistry: vi.fn().mockResolvedValue({
            listLanguageModels: () => [
              { id: 'ollama/llama2', info: () => ({ id: 'ollama/llama2', name: 'Ollama Llama2', private: false }) }
            ],
            languageModel: (id: string) => ({ id, info: () => ({ id, name: 'Ollama Llama2', private: false }) }),
            defaultLanguageModel: () => ({
              id: 'ollama/llama2',
              info: () => ({ id: 'ollama/llama2', name: 'Ollama Llama2', private: false })
            })
          })
        };
      });
      const { providers } = await reImportModules();
      const model = await providers.getDefaultLanguageModel();
      expect(model.info().id).toBe('ollama/llama2');
    });

    it('Scenario: Only OpenAI API key provided - should return an OpenAI model', async () => {
      currentEnv.OPENAI_API_KEY = 'fake-openai-key';
      currentEnv.DEEPSEEK_API_KEY = undefined;
      currentEnv.ANTHROPIC_API_KEY = undefined;
      currentEnv.GOOGLE_GENERATIVE_AI_API_KEY = undefined;
      currentEnv.LITELLM_BASE_URL = undefined;
      currentEnv.OLLAMA_HOST = undefined;

      const { providers } = await reImportModules();
      const model = await providers.getDefaultLanguageModel();
      expect(model.info().id).toContain('openai:');
      // Specifically, it should be gpt-4.1 as per builtin.ts logic when OPENAI_API_KEY is present
      expect(model.info().id).toBe('openai:gpt-4.1');
    });

    it('Scenario: Only DeepSeek API key provided - should return a DeepSeek model', async () => {
      currentEnv.OPENAI_API_KEY = undefined;
      currentEnv.DEEPSEEK_API_KEY = 'fake-deepseek-key';
      currentEnv.ANTHROPIC_API_KEY = undefined;
      currentEnv.GOOGLE_GENERATIVE_AI_API_KEY = undefined;
      currentEnv.LITELLM_BASE_URL = undefined;
      currentEnv.OLLAMA_HOST = undefined;

      const { providers } = await reImportModules();
      const model = await providers.getDefaultLanguageModel();
      expect(model.info().id).toContain('deepseek:');
      expect(model.info().id).toBe('deepseek:chat'); // As per builtin.ts
    });

    it('Scenario: Multiple API keys (OpenAI and DeepSeek) - should prioritize OpenAI', async () => {
      currentEnv.OPENAI_API_KEY = 'fake-openai-key';
      currentEnv.DEEPSEEK_API_KEY = 'fake-deepseek-key';
      currentEnv.ANTHROPIC_API_KEY = undefined;
      currentEnv.GOOGLE_GENERATIVE_AI_API_KEY = undefined;
      currentEnv.LITELLM_BASE_URL = undefined;
      currentEnv.OLLAMA_HOST = undefined;

      const { providers } = await reImportModules();
      const model = await providers.getDefaultLanguageModel();
      expect(model.info().id).toContain('openai:');
      expect(model.info().id).toBe('openai:gpt-4.1');
    });

    it('Scenario: Multiple non-OpenAI API keys (DeepSeek and Anthropic) - should return first available (DeepSeek)', async () => {
      currentEnv.OPENAI_API_KEY = undefined;
      currentEnv.DEEPSEEK_API_KEY = 'fake-deepseek-key';
      currentEnv.ANTHROPIC_API_KEY = 'fake-anthropic-key';
      currentEnv.GOOGLE_GENERATIVE_AI_API_KEY = undefined;
      currentEnv.LITELLM_BASE_URL = undefined;
      currentEnv.OLLAMA_HOST = undefined;

      const { providers } = await reImportModules();
      const model = await providers.getDefaultLanguageModel();
      // Based on the order in builtin.ts, DeepSeek models are added before Anthropic if both keys are present.
      // And Object.values(builtinProviderModels)[0]! would pick the first one if OpenAI is not the default.
      expect(model.info().id).toContain('deepseek:chat');
    });

    it('Scenario: Only Google API key provided - should return a Google model', async () => {
      currentEnv.OPENAI_API_KEY = undefined;
      currentEnv.DEEPSEEK_API_KEY = undefined;
      currentEnv.ANTHROPIC_API_KEY = undefined;
      currentEnv.GOOGLE_GENERATIVE_AI_API_KEY = 'fake-google-key';
      currentEnv.LITELLM_BASE_URL = undefined;
      currentEnv.OLLAMA_HOST = undefined;

      const { providers } = await reImportModules();
      const model = await providers.getDefaultLanguageModel();
      expect(model.info().id).toContain('google:');
      expect(model.info().id).toBe('google:gemini-2.5-pro'); // As per builtin.ts
    });
  });
});
