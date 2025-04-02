'use server';

import { getUserSessionDBAccess } from '~/lib/db/db';
import { getIntegration, saveIntegration } from '~/lib/db/integrations';

export async function actionGetWebhookUrl(projectId: string) {
  const db = await getUserSessionDBAccess();
  return getIntegration(db, projectId, 'slack');
}

export async function actionSaveWebhookUrl(
  projectId: string,
  webhookUrl: string
): Promise<{ success: boolean; message: string }> {
  // TODO: Implement actual saving logic here
  // This is a placeholder for demonstration purposes
  const success = webhookUrl && webhookUrl.startsWith('https://hooks.slack.com/');

  if (!success) {
    // In a real implementation, you would save the webhook URL to your database or configuration
    return { success: false, message: 'Invalid webhook URL' };
  }

  const db = await getUserSessionDBAccess();
  try {
    await saveIntegration(db, projectId, 'slack', { webhookUrl });
  } catch (error) {
    console.error('Failed to save webhook URL:', error);
    return { success: false, message: `Failed to save webhook URL.` };
  }

  console.log('Webhook URL saved:', webhookUrl);
  return { success: true, message: 'Webhook URL saved successfully' };
}
