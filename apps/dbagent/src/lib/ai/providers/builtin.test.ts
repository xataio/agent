import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the env module before importing the builtin provider
const mockEnv = {
  OPENAI_API_KEY: 'test-key' as string | undefined,
  OPENAI_API_BASE: undefined as string | undefined,
  DEEPSEEK_API_KEY: undefined as string | undefined,
  ANTHROPIC_API_KEY: undefined as string | undefined,
  GOOGLE_GENERATIVE_AI_API_KEY: undefined as string | undefined
};

vi.mock('~/lib/env/server', () => ({
  env: mockEnv
}));

// Mock the AI SDK providers
const mockOpenAI = {
  languageModel: vi.fn()
};

const mockCreateOpenAI = vi.fn(() => mockOpenAI);

vi.mock('@ai-sdk/openai', () => ({
  openai: mockOpenAI,
  createOpenAI: mockCreateOpenAI
}));

vi.mock('@ai-sdk/anthropic');
vi.mock('@ai-sdk/deepseek');
vi.mock('@ai-sdk/google');

describe('Builtin Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.OPENAI_API_KEY = 'test-key';
    mockEnv.OPENAI_API_BASE = undefined;
  });

  afterEach(() => {
    // Reset modules to ensure fresh imports
    vi.resetModules();
  });

  describe('OpenAI Provider Configuration', () => {
    it('should use default openai provider when no custom base URL is configured', async () => {
      mockEnv.OPENAI_API_BASE = undefined;

      // Import after mocking to ensure fresh module
      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const models = registry.listLanguageModels();

      expect(models.length).toBeGreaterThan(0);
      expect(mockCreateOpenAI).not.toHaveBeenCalled();
    });

    it('should use createOpenAI with custom base URL when OPENAI_API_BASE is configured', async () => {
      mockEnv.OPENAI_API_BASE = 'https://custom.openai.endpoint.com/v1';

      // Import after mocking to ensure fresh module
      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const models = registry.listLanguageModels();

      expect(models.length).toBeGreaterThan(0);
      expect(mockCreateOpenAI).toHaveBeenCalledWith({
        baseURL: 'https://custom.openai.endpoint.com/v1',
        apiKey: 'test-key'
      });
    });

    it('should create OpenAI models when API key is available', async () => {
      mockEnv.OPENAI_API_KEY = 'valid-key';

      // Import after mocking to ensure fresh module
      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const models = registry.listLanguageModels();

      // Should have OpenAI models (assuming other providers don't have keys)
      const openaiModels = models.filter((m) => m.info().id.startsWith('openai:'));
      expect(openaiModels.length).toBeGreaterThan(0);
    });

    it('should not create OpenAI models when API key is missing', async () => {
      mockEnv.OPENAI_API_KEY = undefined;
      mockEnv.DEEPSEEK_API_KEY = 'deepseek-key'; // Enable another provider to avoid error

      // Import after mocking to ensure fresh module
      const { getBuiltinProviderRegistry } = await import('./builtin');

      const registry = getBuiltinProviderRegistry();
      const models = registry.listLanguageModels();

      // Should not have OpenAI models
      const openaiModels = models.filter((m) => m.info().id.startsWith('openai:'));
      expect(openaiModels.length).toBe(0);
    });

    it('should handle custom base URL with different configurations', async () => {
      const testCases = [
        'https://api.openai.com/v1',
        'https://custom-endpoint.example.com/v1',
        'http://localhost:8080/v1'
      ];

      for (const baseUrl of testCases) {
        vi.clearAllMocks();
        vi.resetModules();

        mockEnv.OPENAI_API_BASE = baseUrl;
        mockEnv.OPENAI_API_KEY = 'test-key';

        // Import after mocking to ensure fresh module
        const { getBuiltinProviderRegistry } = await import('./builtin');

        const registry = getBuiltinProviderRegistry();
        const models = registry.listLanguageModels();

        expect(models.length).toBeGreaterThan(0);
        expect(mockCreateOpenAI).toHaveBeenCalledWith({
          baseURL: baseUrl,
          apiKey: 'test-key'
        });
      }
    });
  });
});
