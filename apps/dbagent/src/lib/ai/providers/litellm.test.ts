import type { Deployment } from '@internal/litellm-client';
import { describe, expect, it } from 'vitest';
import { createLiteLLMProviderRegistryFromDeployments } from './litellm';

const baseConfig = {
  baseUrl: 'http://test',
  apiKey: 'test-key'
};

describe('LiteLLM Provider', () => {
  describe('Model Creation', () => {
    it('should create models from deployments correctly', async () => {
      const mockDeployments: Deployment[] = [
        {
          model_name: 'Test Model 1',
          model_info: {
            mode: 'chat',
            xata_agent: {
              model_id: 'test:model1',
              private: false
            }
          },
          litellm_params: {
            model: 'test/model1'
          }
        },
        {
          model_name: 'Test Model 2',
          model_info: {
            mode: 'chat',
            xata_agent: {
              model_id: 'test:model2',
              private: true
            }
          },
          litellm_params: {
            model: 'test/model2'
          }
        }
      ];

      const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

      const models = registry.listLanguageModels();
      expect(models).toHaveLength(2);

      const model1 = models.find((m) => m.info().id === 'test:model1');
      expect(model1).toBeDefined();
      expect(model1?.info().name).toBe('Test Model 1');
      expect(model1?.info().private).toBe(false);

      const model2 = models.find((m) => m.info().id === 'test:model2');
      expect(model2).toBeDefined();
      expect(model2?.info().name).toBe('Test Model 2');
      expect(model2?.info().private).toBe(true);
    });

    it('should handle missing model_info gracefully', async () => {
      const mockDeployments: Deployment[] = [
        {
          model_name: 'Test Model',
          litellm_params: {
            model: 'test/model'
          },
          model_info: {
            mode: 'chat'
          }
        }
      ];

      const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

      const models = registry.listLanguageModels();
      expect(models).toHaveLength(1);

      const model = models[0];
      expect(model.info().id).toBe('test:model');
      expect(model.info().name).toBe('Test Model');
      expect(model.info().private).toBeUndefined();
    });

    it('should handle missing xata_agent gracefully', async () => {
      const mockDeployments: Deployment[] = [
        {
          model_name: 'Test Model',
          litellm_params: {
            model: 'test/model'
          },
          model_info: {
            mode: 'chat'
          }
        }
      ];

      const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

      const models = registry.listLanguageModels();
      expect(models).toHaveLength(1);

      const model = models[0];
      expect(model.info().id).toBe('test:model');
      expect(model.info().name).toBe('Test Model');
      expect(model.info().private).toBeUndefined();
    });

    it('should use correct model IDs from various sources', async () => {
      const mockDeployments: Deployment[] = [
        {
          model_name: 'Test Model 1',
          model_info: {
            mode: 'chat',
            xata_agent: {
              model_id: 'custom:id1'
            }
          }
        },
        {
          model_name: 'Test Model 2',
          litellm_params: {
            model: 'test/model2'
          },
          model_info: {
            mode: 'chat'
          }
        },
        {
          model_name: 'Test Model 3',
          model_info: {
            mode: 'chat'
          }
        }
      ];

      const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

      const models = registry.listLanguageModels();
      expect(models).toHaveLength(3);

      expect(models.find((m) => m.info().id === 'custom:id1')).toBeDefined();
      expect(models.find((m) => m.info().id === 'test:model2')).toBeDefined();
      expect(models.find((m) => m.info().id === 'Test Model 3')).toBeDefined();
    });

    it('should sort models by name', async () => {
      const mockDeployments: Deployment[] = [
        {
          model_name: 'Z Model',
          model_info: {
            mode: 'chat',
            xata_agent: {
              model_id: 'test:z'
            }
          }
        },
        {
          model_name: 'A Model',
          model_info: {
            mode: 'chat',
            xata_agent: {
              model_id: 'test:a'
            }
          }
        },
        {
          model_name: 'M Model',
          model_info: {
            mode: 'chat',
            xata_agent: {
              model_id: 'test:m'
            }
          }
        }
      ];

      const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

      const models = registry.listLanguageModels();
      expect(models).toHaveLength(3);

      expect(models[0].info().name).toBe('A Model');
      expect(models[1].info().name).toBe('M Model');
      expect(models[2].info().name).toBe('Z Model');
    });
  });

  describe('Model Lookup', () => {
    const mockDeployments: Deployment[] = [
      {
        model_name: 'Test Model 1',
        litellm_params: {
          model: 'test/model1'
        },
        model_info: {
          mode: 'chat',
          xata_agent: {
            private: false
          }
        }
      },
      {
        model_name: 'Test Model 2',
        litellm_params: {
          model: 'test/model2'
        },
        model_info: {
          mode: 'chat',
          xata_agent: {
            private: true
          }
        }
      },
      {
        model_name: 'Fallback Model',
        litellm_params: {
          model: 'test/fallback'
        },
        model_info: {
          mode: 'chat',
          xata_agent: {
            private: false,
            group_fallback: 'test'
          }
        }
      }
    ];

    const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

    describe('Exact Match', () => {
      it('should find model by exact ID match', async () => {
        const model = registry.languageModel('test:model1');
        expect(model.info().id).toBe('test:model1');
        expect(model.isFallback).toBe(false);
      });

      it('should return correct model info for exact matches', async () => {
        const model = registry.languageModel('test:model2');
        expect(model.info().private).toBe(true);
        expect(model.info().name).toBe('Test Model 2');
      });

      it('should handle case sensitivity in model IDs', async () => {
        expect(() => registry.languageModel('TEST:MODEL1')).toThrow();
      });
    });

    describe('Group Fallback', () => {
      it('should fallback to group model when exact match not found', async () => {
        const model = registry.languageModel('test:unknown', true);
        expect(model.info().id).toBe('test:fallback');
        expect(model.isFallback).toBe(true);
        expect(model.requestedModelId).toBe('test:unknown');
      });

      it('should mark fallback models correctly in ModelWithFallback', async () => {
        const exactMatch = registry.languageModel('test:model1');
        expect(exactMatch.isFallback).toBe(false);

        const fallback = registry.languageModel('test:unknown', true);
        expect(fallback.isFallback).toBe(true);
      });

      it('should handle missing group fallback gracefully', async () => {
        expect(() => registry.languageModel('unknown:model')).toThrow();
      });
    });

    describe('Error Handling', () => {
      it('should throw error when model not found and no fallback available', async () => {
        expect(() => registry.languageModel('nonexistent:model')).toThrow();
      });

      it('should throw error when fallback model not found', async () => {
        expect(() => registry.languageModel('test:unknown')).toThrow();
      });
    });
  });
});
