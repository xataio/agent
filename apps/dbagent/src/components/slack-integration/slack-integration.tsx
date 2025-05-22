'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  toast,
  useForm
} from '@xata.io/components';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { actionGetWebhookUrl, actionSaveWebhookUrl } from './actions';

export function SlackIntegration({ projectId }: { projectId: string }) {
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm({
    defaultValues: {
      webhookUrl: ''
    }
  });

  useEffect(() => {
    const fetchWebhookUrl = async () => {
      try {
        const data = await actionGetWebhookUrl(projectId);
        if (data) {
          setValue('webhookUrl', data.webhookUrl);
        }
      } catch (error) {
        toast('Failed to load existing webhook configuration');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchWebhookUrl();
  }, [setValue]);

  const onSubmit = async (data: { webhookUrl: string }) => {
    try {
      const response = await actionSaveWebhookUrl(projectId, data.webhookUrl);
      if (response.success) {
        toast('Slack webhook URL saved successfully');
      } else {
        toast(`Error saving Slack webhook URL. ${response.message}`);
      }
    } catch (error) {
      toast(`Failed to save Slack webhook URL.`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Configure slack notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Alert>
            <AlertTitle>Create a Slack Webhook</AlertTitle>
            <AlertDescription>
              To create an incoming webhook for posting to your Slack workspace,{' '}
              <Link
                href="https://github.com/xataio/agent/wiki/Xata-Agent-%E2%80%90-Slack-integration-guide"
                target="_blank"
                className="font-medium underline"
              >
                follow this guide
              </Link>
              . It only takes a few minutes to set up.
            </AlertDescription>
          </Alert>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Incoming Webhook URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                disabled={isLoading}
                {...register('webhookUrl', {
                  required: 'Webhook URL is required',
                  pattern: {
                    value: /^https:\/\/hooks\.slack\.com\/.+/,
                    message: 'Must be a valid Slack webhook URL'
                  }
                })}
              />
              {errors.webhookUrl && <p className="text-sm text-red-500">{errors.webhookUrl.message}</p>}
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Save Webhook URL'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
