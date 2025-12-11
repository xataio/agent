import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
const mockListLanguageModels = vi.fn();
const mockGetUserSessionDBAccess = vi.fn();
const mockGetProjectById = vi.fn();
const mockGetModelSettings = vi.fn();
const mockGetDefaultModel = vi.fn();
const mockDeleteModelSetting = vi.fn();
const mockSetDefaultModel = vi.fn();
const mockUpdateModelEnabled = vi.fn();

vi.mock('~/lib/ai/providers', () => ({
  listLanguageModels: () => mockListLanguageModels()
}));

vi.mock('~/lib/db/db', () => ({
  getUserSessionDBAccess: () => mockGetUserSessionDBAccess()
}));

vi.mock('~/lib/db/projects', () => ({
  getProjectById: (_dbAccess: unknown, projectId: string) => mockGetProjectById(projectId)
}));

vi.mock('~/lib/db/model-settings', () => ({
  getModelSettings: (_dbAccess: unknown, projectId: string) => mockGetModelSettings(projectId),
  getDefaultModel: (_dbAccess: unknown, projectId: string) => mockGetDefaultModel(projectId),
  deleteModelSetting: (_dbAccess: unknown, projectId: string, modelId: string) =>
    mockDeleteModelSetting(projectId, modelId),
  setDefaultModel: (_dbAccess: unknown, projectId: string, modelId: string) => mockSetDefaultModel(projectId, modelId),
  updateModelEnabled: (_dbAccess: unknown, projectId: string, modelId: string, enabled: boolean) =>
    mockUpdateModelEnabled(projectId, modelId, enabled)
}));

// Helper to create mock model
function createMockModel(id: string, name: string) {
  return {
    info: () => ({ id, name }),
    instance: () => ({})
  };
}

// Helper to create NextRequest
function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('/api/models', () => {
  const mockDbAccess = { query: vi.fn() };
  const projectId = 'test-project-id';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserSessionDBAccess.mockResolvedValue(mockDbAccess);
    mockGetProjectById.mockResolvedValue({ id: projectId, name: 'Test Project' });
  });

  describe('GET', () => {
    it('should return 400 if projectId is missing', async () => {
      const { GET } = await import('./route');
      const request = createRequest('http://localhost/api/models');

      const response = await GET(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('projectId is required');
    });

    it('should return 404 if project not found', async () => {
      mockGetProjectById.mockResolvedValue(null);

      const { GET } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}`);

      const response = await GET(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Project not found');
    });

    it('should return models with settings', async () => {
      const mockModels = [createMockModel('openai:gpt-4', 'GPT-4'), createMockModel('anthropic:claude', 'Claude')];
      mockListLanguageModels.mockResolvedValue(mockModels);
      mockGetModelSettings.mockResolvedValue([{ modelId: 'openai:gpt-4', enabled: false }]);
      mockGetDefaultModel.mockResolvedValue({ modelId: 'anthropic:claude' });

      const { GET } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.models).toHaveLength(2);
      expect(data.models[0]).toEqual({
        id: 'openai:gpt-4',
        name: 'GPT-4',
        enabled: false,
        isDefault: false
      });
      expect(data.models[1]).toEqual({
        id: 'anthropic:claude',
        name: 'Claude',
        enabled: true, // default when no setting
        isDefault: true
      });
    });

    it('should return missing models (orphaned settings)', async () => {
      const mockModels = [createMockModel('openai:gpt-4', 'GPT-4')];
      mockListLanguageModels.mockResolvedValue(mockModels);
      // Settings exist for both gpt-4 (available) and old-model (missing)
      mockGetModelSettings.mockResolvedValue([
        { modelId: 'openai:gpt-4', enabled: true },
        { modelId: 'old-model:removed', enabled: false }
      ]);
      mockGetDefaultModel.mockResolvedValue(null);

      const { GET } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.models).toHaveLength(1);
      expect(data.models[0].id).toBe('openai:gpt-4');

      expect(data.missingModels).toHaveLength(1);
      expect(data.missingModels[0]).toEqual({
        id: 'old-model:removed',
        name: 'old-model:removed', // Uses ID as name
        enabled: false,
        isDefault: false
      });
    });

    it('should mark missing model as default if it was default', async () => {
      const mockModels = [createMockModel('openai:gpt-4', 'GPT-4')];
      mockListLanguageModels.mockResolvedValue(mockModels);
      mockGetModelSettings.mockResolvedValue([
        { modelId: 'openai:gpt-4', enabled: true },
        { modelId: 'old-default:removed', enabled: true }
      ]);
      mockGetDefaultModel.mockResolvedValue({ modelId: 'old-default:removed' });

      const { GET } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}`);

      const response = await GET(request);
      const data = await response.json();

      expect(data.missingModels).toHaveLength(1);
      expect(data.missingModels[0].isDefault).toBe(true);
    });

    it('should return empty missingModels when all settings have available models', async () => {
      const mockModels = [createMockModel('openai:gpt-4', 'GPT-4'), createMockModel('anthropic:claude', 'Claude')];
      mockListLanguageModels.mockResolvedValue(mockModels);
      mockGetModelSettings.mockResolvedValue([{ modelId: 'openai:gpt-4', enabled: true }]);
      mockGetDefaultModel.mockResolvedValue(null);

      const { GET } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}`);

      const response = await GET(request);
      const data = await response.json();

      expect(data.missingModels).toHaveLength(0);
    });
  });

  describe('DELETE', () => {
    it('should return 400 if projectId is missing', async () => {
      const { DELETE } = await import('./route');
      const request = createRequest('http://localhost/api/models?modelId=test');

      const response = await DELETE(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('projectId is required');
    });

    it('should return 400 if modelId is missing', async () => {
      const { DELETE } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}`);

      const response = await DELETE(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('modelId is required');
    });

    it('should return 404 if project not found', async () => {
      mockGetProjectById.mockResolvedValue(null);

      const { DELETE } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}&modelId=test`);

      const response = await DELETE(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Project not found');
    });

    it('should return 400 when trying to delete default model settings', async () => {
      mockGetDefaultModel.mockResolvedValue({ modelId: 'default-model' });

      const { DELETE } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}&modelId=default-model`);

      const response = await DELETE(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe(
        'Cannot delete settings for the default model. Set another model as default first.'
      );
      expect(mockDeleteModelSetting).not.toHaveBeenCalled();
    });

    it('should successfully delete model settings', async () => {
      mockGetDefaultModel.mockResolvedValue({ modelId: 'other-model' });
      mockDeleteModelSetting.mockResolvedValue(undefined);

      const { DELETE } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}&modelId=model-to-delete`);

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Model setting deleted');
      expect(mockDeleteModelSetting).toHaveBeenCalledWith(projectId, 'model-to-delete');
    });

    it('should successfully delete model settings when no default is set', async () => {
      mockGetDefaultModel.mockResolvedValue(null);
      mockDeleteModelSetting.mockResolvedValue(undefined);

      const { DELETE } = await import('./route');
      const request = createRequest(`http://localhost/api/models?projectId=${projectId}&modelId=model-to-delete`);

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDeleteModelSetting).toHaveBeenCalledWith(projectId, 'model-to-delete');
    });
  });
});
