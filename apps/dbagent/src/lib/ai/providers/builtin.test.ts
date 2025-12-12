import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the env module before importing builtin
const mockEnv = {
  OPENAI_API_KEY: undefined as string | undefined,
  OPENAI_BASE_URL: undefined as string | undefined,
  DEEPSEEK_API_KEY: undefined as string | undefined,
  ANTHROPIC_API_KEY: undefined as string | undefined,
  GOOGLE_GENERATIVE_AI_API_KEY: undefined as string | undefined
};

vi.mock('~/lib/env/server', () => ({
  env: mockEnv
}));

// Mock AI SDK providers to avoid actual API calls
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    languageModel: vi.fn((id: string) => ({ modelId: id, provider: 'openai' }))
  }))
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: {
    languageModel: vi.fn((id: string) => ({ modelId: id, provider: 'anthropic' }))
  }
}));

vi.mock('@ai-sdk/deepseek', () => ({
  deepseek: {
    languageModel: vi.fn((id: string) => ({ modelId: id, provider: 'deepseek' }))
  }
}));

vi.mock('@ai-sdk/google', () => ({
  google: {
    languageModel: vi.fn((id: string) => ({ modelId: id, provider: 'google' }))
  }
}));

describe('Builtin Provider Registry', () => {
  beforeEach(() => {
    // Reset all env vars before each test
    mockEnv.OPENAI_API_KEY = undefined;
    mockEnv.OPENAI_BASE_URL = undefined;
    mockEnv.DEEPSEEK_API_KEY = undefined;
    mockEnv.ANTHROPIC_API_KEY = undefined;
    mockEnv.GOOGLE_GENERATIVE_AI_API_KEY = undefined;

    // Clear module cache to re-evaluate lazy initialization
    vi.resetModules();
  });

  describe('getBuiltinProviderRegistry', () => {
    it('should return null when no API keys are configured', async () => {
      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();

      expect(registry).toBeNull();
    });

    it('should return registry with OpenAI models when OPENAI_API_KEY is set', async () => {
      mockEnv.OPENAI_API_KEY = 'test-openai-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();

      expect(registry).not.toBeNull();
      const models = registry!.listLanguageModels();
      expect(models.length).toBeGreaterThan(0);

      const modelIds = models.map((m) => m.info().id);
      expect(modelIds).toContain('openai:gpt-5');
      expect(modelIds).toContain('openai:gpt-4o');
    });

    it('should return registry with Anthropic models when ANTHROPIC_API_KEY is set', async () => {
      mockEnv.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();

      expect(registry).not.toBeNull();
      const models = registry!.listLanguageModels();
      expect(models.length).toBeGreaterThan(0);

      const modelIds = models.map((m) => m.info().id);
      expect(modelIds).toContain('anthropic:claude-sonnet-4-5');
      expect(modelIds).toContain('anthropic:claude-opus-4-1');
      // Should NOT contain OpenAI models
      expect(modelIds).not.toContain('openai:gpt-5');
    });

    it('should return registry with DeepSeek models when DEEPSEEK_API_KEY is set', async () => {
      mockEnv.DEEPSEEK_API_KEY = 'test-deepseek-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();

      expect(registry).not.toBeNull();
      const models = registry!.listLanguageModels();

      const modelIds = models.map((m) => m.info().id);
      expect(modelIds).toContain('deepseek:chat');
    });

    it('should return registry with Google models when GOOGLE_GENERATIVE_AI_API_KEY is set', async () => {
      mockEnv.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();

      expect(registry).not.toBeNull();
      const models = registry!.listLanguageModels();

      const modelIds = models.map((m) => m.info().id);
      expect(modelIds).toContain('google:gemini-2.5-pro');
      expect(modelIds).toContain('google:gemini-2.5-flash');
    });

    it('should return registry with models from multiple providers when multiple keys are set', async () => {
      mockEnv.OPENAI_API_KEY = 'test-openai-key';
      mockEnv.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();

      expect(registry).not.toBeNull();
      const models = registry!.listLanguageModels();

      const modelIds = models.map((m) => m.info().id);
      // Should contain both OpenAI and Anthropic models
      expect(modelIds).toContain('openai:gpt-5');
      expect(modelIds).toContain('anthropic:claude-sonnet-4-5');
    });

    it('should memoize the registry (return same instance on subsequent calls)', async () => {
      mockEnv.OPENAI_API_KEY = 'test-openai-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry1 = getBuiltinProviderRegistry();
      const registry2 = getBuiltinProviderRegistry();

      expect(registry1).toBe(registry2);
    });
  });

  describe('hasBuiltinProviders', () => {
    it('should return false when no API keys are configured', async () => {
      const { hasBuiltinProviders } = await import('./builtin');

      expect(hasBuiltinProviders()).toBe(false);
    });

    it('should return true when at least one API key is configured', async () => {
      mockEnv.DEEPSEEK_API_KEY = 'test-key';

      const { hasBuiltinProviders } = await import('./builtin');

      expect(hasBuiltinProviders()).toBe(true);
    });
  });

  describe('Default Model Selection', () => {
    it('should use OpenAI GPT-5 as default when OpenAI is configured', async () => {
      mockEnv.OPENAI_API_KEY = 'test-openai-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const defaultModel = registry!.defaultLanguageModel();

      expect(defaultModel).not.toBeNull();
      expect(defaultModel!.info().id).toBe('openai:gpt-5');
    });

    it('should use first available model as default when OpenAI is not configured', async () => {
      mockEnv.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const defaultModel = registry!.defaultLanguageModel();

      expect(defaultModel).not.toBeNull();
      // First Anthropic model should be the default
      expect(defaultModel!.info().id).toBe('anthropic:claude-sonnet-4-5');
    });
  });

  describe('Model Aliases', () => {
    it('should resolve chat alias to default model', async () => {
      mockEnv.OPENAI_API_KEY = 'test-openai-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const chatModel = registry!.languageModel('chat');

      expect(chatModel.info().id).toBe('openai:gpt-5');
    });

    it('should resolve title alias to GPT-5-mini when OpenAI is configured', async () => {
      mockEnv.OPENAI_API_KEY = 'test-openai-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const titleModel = registry!.languageModel('title');

      expect(titleModel.info().id).toBe('openai:gpt-5-mini');
    });

    it('should resolve aliases to first available model when OpenAI is not configured', async () => {
      mockEnv.DEEPSEEK_API_KEY = 'test-deepseek-key';

      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const chatModel = registry!.languageModel('chat');

      // Should fallback to first DeepSeek model
      expect(chatModel.info().id).toBe('deepseek:chat');
    });
  });
});
