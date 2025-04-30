import { Schemas } from 'litellm-api';
import { describe, expect, it } from 'vitest';
import { createLiteLLMProviderRegistryFromDeployments } from './litellm';

const baseConfig = {
  baseUrl: 'http://test',
  token: 'test-key'
};

describe('LiteLLM Provider', () => {
  describe('Model Creation', () => {
    it('should create models from deployments correctly', async () => {
      const mockDeployments: Schemas.Deployment[] = [
        {
          model_name: 'Test Model 1',
          litellm_params: { model: 'test/model1' },
          model_info: {
            id: '12345',
            mode: 'chat',
            xata_agent: {
              model_id: 'test:model1',
              private: false
            }
          }
        },
        {
          model_name: 'Test Model 2',
          litellm_params: { model: 'test/model2' },
          model_info: {
            id: '12345',
            mode: 'chat',
            xata_agent: {
              model_id: 'test:model2',
              private: true
            }
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
      const mockDeployments: Schemas.Deployment[] = [
        {
          model_name: 'Test Model',
          litellm_params: { model: 'test/model' },
          model_info: {
            id: '12345',
            mode: 'chat'
          }
        }
      ];

      const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

      const models = registry.listLanguageModels();
      expect(models).toHaveLength(1);

      const model = models[0]!;
      expect(model.info().id).toBe('test:model');
      expect(model.info().name).toBe('Test Model');
      expect(model.info().private).toBeDefined();
    });

    it('should handle missing xata_agent gracefully', async () => {
      const mockDeployments: Schemas.Deployment[] = [
        {
          model_name: 'Test Model',
          litellm_params: { model: 'test/model' },
          model_info: {
            id: '12345',
            mode: 'chat'
          }
        }
      ];

      const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

      const models = registry.listLanguageModels();
      expect(models).toHaveLength(1);

      const model = models[0]!;
      expect(model.info().id).toBe('test:model');
      expect(model.info().name).toBe('Test Model');
      expect(model.info().private).toBeDefined();
    });

    it('should use correct model IDs from various sources', async () => {
      const mockDeployments: Schemas.Deployment[] = [
        {
          model_name: 'Test Model 1',
          litellm_params: { model: 'test/model1' },
          model_info: {
            id: '12345',
            mode: 'chat',
            xata_agent: {
              model_id: 'custom:id1'
            }
          }
        },
        {
          model_name: 'Test Model 2',
          litellm_params: { model: 'test/model2' },
          model_info: {
            id: '12345',
            mode: 'chat'
          }
        },
        {
          model_name: 'Test Model 3',
          litellm_params: { model: 'test/model3' },
          model_info: {
            id: '12345',
            mode: 'chat'
          }
        }
      ];

      const registry = createLiteLLMProviderRegistryFromDeployments(baseConfig, mockDeployments);

      const models = registry.listLanguageModels();
      expect(models).toHaveLength(3);

      expect(models.find((m) => m.info().id === 'custom:id1')).toBeDefined();
      expect(models.find((m) => m.info().id === 'test:model2')).toBeDefined();
      expect(models.find((m) => m.info().id === 'test:model3')).toBeDefined();
    });

    it('should sort models by name', async () => {
      const mockDeployments: Schemas.Deployment[] = [
        {
          model_name: 'Z Model',
          litellm_params: { model: 'test/z' },
          model_info: {
            id: '12345',
            mode: 'chat',
            xata_agent: {
              model_id: 'test:z'
            }
          }
        },
        {
          model_name: 'A Model',
          litellm_params: { model: 'test/a' },
          model_info: {
            id: '12345',
            mode: 'chat',
            xata_agent: {
              model_id: 'test:a'
            }
          }
        },
        {
          model_name: 'M Model',
          litellm_params: { model: 'test/m' },
          model_info: {
            id: '12345',
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

      expect(models[0]!.info().name).toBe('A Model');
      expect(models[1]!.info().name).toBe('M Model');
      expect(models[2]!.info().name).toBe('Z Model');
    });
  });

  describe('Model Lookup', () => {
    const mockDeployments: Schemas.Deployment[] = [
      {
        model_name: 'Test Model 1',
        litellm_params: { model: 'test/model1' },
        model_info: {
          id: '12345',
          mode: 'chat',
          xata_agent: {
            alias: ['chat']
          }
        }
      },
      {
        model_name: 'Test Model 2',
        litellm_params: { model: 'test/model2' },
        model_info: {
          id: '12345',
          mode: 'chat',
          xata_agent: {
            private: true,
            alias: ['title']
          }
        }
      },
      {
        model_name: 'Fallback Model',
        litellm_params: { model: 'test/fallback' },
        model_info: {
          id: '12345',
          mode: 'chat',
          xata_agent: {
            private: false,
            group_fallback: 'test',
            priority: 10
          }
        }
      },
      {
        model_name: 'Alt Fallback Model',
        litellm_params: { model: 'alt/fallback' },
        model_info: {
          id: '12345',
          mode: 'chat',
          xata_agent: {
            group_fallback: 'alt',
            priority: 1
          }
        }
      },
      {
        model_name: 'Alt Fallback Model 2',
        litellm_params: { model: 'alt/fallback2' },
        model_info: {
          id: '12345',
          mode: 'chat',
          xata_agent: {
            group_fallback: 'alt',
            priority: 10
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
        expect(model.info().id).toBe('test:model2');
      });

      it('should be case insensitive', async () => {
        expect(() => registry.languageModel('TEST:MODEL1')).toThrow();
      });

      it('should fail if fallback exists, but was not requested', async () => {
        expect(() => registry.languageModel('alt:unknown')).toThrow();
      });
    });

    describe('Alias', () => {
      it('should find model by alias', async () => {
        const model = registry.languageModel('title');
        expect(model.info().id).toBe('test:model2');
      });

      it('should fail if alias does not exist', async () => {
        expect(() => registry.languageModel('unknown')).toThrow();
      });
    });

    describe('Group Fallback', () => {
      it('should fallback to group model when exact match not found', async () => {
        const model = registry.languageModel('test:unknown', true);
        expect(model.info().id).toBe('test:fallback');
        expect(model.isFallback).toBe(true);
        expect(model.requestedModelId).toBe('test:unknown');
      });

      it('should mark fallback models correctly', async () => {
        const exactMatch = registry.languageModel('test:model1');
        expect(exactMatch.isFallback).toBe(false);

        const fallback = registry.languageModel('test:unknown', true);
        expect(fallback.isFallback).toBe(true);
      });

      it('should use highest priority model for fallback', async () => {
        const fallback = registry.languageModel('alt:unknown', true);
        expect(fallback.isFallback).toBe(true);
        expect(fallback.info().id).toBe('alt:fallback2');
      });

      it('should throw error when no group fallback exists', async () => {
        expect(() => registry.languageModel('unknown:model')).toThrow();
      });
    });
  });
});
