import { NextRequest } from 'next/server';
import { listLanguageModels } from '~/lib/ai/providers';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getDefaultModel, getModelSettings, setDefaultModel, updateModelEnabled } from '~/lib/db/model-settings';
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

    return Response.json({ models: modelsWithSettings });
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
