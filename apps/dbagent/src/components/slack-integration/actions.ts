'use server';

import { getIntegration, saveIntegration, SlackIntegration } from '~/lib/db/integrations';

export async function saveWebhookUrl(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  // TODO: Implement actual saving logic here
  // This is a placeholder for demonstration purposes
  const success = webhookUrl && webhookUrl.startsWith('https://hooks.slack.com/');

  if (!success) {
    // In a real implementation, you would save the webhook URL to your database or configuration
    return { success: false, message: 'Invalid webhook URL' };
  }

  try {
    await saveIntegration('slack', { webhookUrl });
  } catch (error) {
    console.error('Failed to save webhook URL:', error);
    return { success: false, message: `Failed to save webhook URL.` };
  }

  console.log('Webhook URL saved:', webhookUrl);
  return { success: true, message: 'Webhook URL saved successfully' };
}

export async function getWebhookUrl(): Promise<SlackIntegration | null> {
  return await getIntegration('slack');
}
