import { NextRequest } from 'next/server';
import { listLanguageModels } from '~/lib/ai/providers';
import { getUserSessionDBAccess } from '~/lib/db/db';
import {
  deleteModelSetting,
  getDefaultModel,
  getModelSettings,
  setDefaultModel,
  updateModelEnabled
} from '~/lib/db/model-settings';
import { getProjectById } from '~/lib/db/projects';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return new Response('projectId is required', { status: 400 });
  }

  try {
    const dbAccess = await getUserSessionDBAccess();

    // Verify project access
    const project = await getProjectById(dbAccess, projectId);
    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // Get all available models from providers
    const allModels = await listLanguageModels();
    const availableModelIds = new Set(allModels.map((m) => m.info().id));

    // Get user's model settings for this project
    const settings = await getModelSettings(dbAccess, projectId);
    const settingsMap = new Map(settings.map((s) => [s.modelId, s]));

    // Get default model setting
    const defaultSetting = await getDefaultModel(dbAccess, projectId);

    // Combine models with their settings
    const modelsWithSettings = allModels.map((model) => {
      const info = model.info();
      const setting = settingsMap.get(info.id);
      return {
        id: info.id,
        name: info.name,
        enabled: setting ? setting.enabled : true, // Default to enabled if no setting
        isDefault: defaultSetting?.modelId === info.id
      };
    });

    // Find missing models (settings exist but model is no longer available)
    const missingModels = settings
      .filter((s) => !availableModelIds.has(s.modelId))
      .map((s) => ({
        id: s.modelId,
        name: s.modelId, // Use ID as name since model info is unavailable
        enabled: s.enabled,
        isDefault: defaultSetting?.modelId === s.modelId
      }));

    return Response.json({ models: modelsWithSettings, missingModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    return new Response('An error occurred while fetching models', { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return new Response('projectId is required', { status: 400 });
  }

  try {
    const body = await request.json();
    const { modelId, enabled, isDefault } = body;

    if (!modelId) {
      return new Response('modelId is required', { status: 400 });
    }

    const dbAccess = await getUserSessionDBAccess();

    // Verify project access
    const project = await getProjectById(dbAccess, projectId);
    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // Handle setting default model
    if (isDefault === true) {
      await setDefaultModel(dbAccess, projectId, modelId);
      return Response.json({ success: true, message: 'Default model updated' });
    }

    // Handle enabling/disabling model
    if (typeof enabled === 'boolean') {
      // Prevent disabling the default model
      if (!enabled) {
        const defaultSetting = await getDefaultModel(dbAccess, projectId);
        if (defaultSetting?.modelId === modelId) {
          return new Response('Cannot disable the default model. Set another model as default first.', {
            status: 400
          });
        }
      }

      await updateModelEnabled(dbAccess, projectId, modelId, enabled);
      return Response.json({ success: true, message: 'Model setting updated' });
    }

    return new Response('No valid operation specified', { status: 400 });
  } catch (error) {
    console.error('Error updating model settings:', error);
    return new Response('An error occurred while updating model settings', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const modelId = searchParams.get('modelId');

  if (!projectId) {
    return new Response('projectId is required', { status: 400 });
  }

  if (!modelId) {
    return new Response('modelId is required', { status: 400 });
  }

  try {
    const dbAccess = await getUserSessionDBAccess();

    // Verify project access
    const project = await getProjectById(dbAccess, projectId);
    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // Prevent deleting settings for a model that is set as default
    const defaultSetting = await getDefaultModel(dbAccess, projectId);
    if (defaultSetting?.modelId === modelId) {
      return new Response('Cannot delete settings for the default model. Set another model as default first.', {
        status: 400
      });
    }

    await deleteModelSetting(dbAccess, projectId, modelId);
    return Response.json({ success: true, message: 'Model setting deleted' });
  } catch (error) {
    console.error('Error deleting model setting:', error);
    return new Response('An error occurred while deleting model setting', { status: 500 });
  }
}
