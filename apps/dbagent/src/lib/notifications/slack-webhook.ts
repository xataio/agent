import { DBAccess } from '../db/db';
import { getIntegration } from '../db/integrations';
import { Connection, NotificationLevel, Schedule, ScheduleRun } from '../db/schema';
import { env } from '../env/client';

export async function sendScheduleNotification(
  dbAccess: DBAccess,
  run: ScheduleRun,
  schedule: Schedule,
  connection: Connection,
  level: NotificationLevel,
  title: string,
  message: string,
  extraNotificationText?: string
) {
  const slack = await getIntegration(dbAccess, connection.projectId, 'slack');
  if (!slack) {
    console.error('No Slack integration configured.');
    return;
  }

  // Format message for Slack "markdown"
  message = message
    .replace(/^### (.*$)/gm, '*$1*') // h3 headers to bold
    .replace(/^## (.*$)/gm, '*$1*') // h2 headers to bold
    .replace(/^# (.*$)/gm, '*$1*') // h1 headers to bold
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // bold
    .replace(/__(.*?)__/g, '_$1_') // underline/italics
    .replace(/\[(.*?)\]\((.*?)\)/g, '<$2|$1>') // links
    .replace(/`{3}([\s\S]*?)`{3}/g, '```$1```') // code blocks
    .replace(/`([^`]+)`/g, '`$1`'); // inline code

  const slackEmoji = level === 'info' ? ':white_check_mark:' : level === 'warning' ? ':warning:' : ':alert:';

  const slackBlocks = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          emoji: true,
          text: slackEmoji + ' ' + title
        }
      },
      ...(extraNotificationText
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: extraNotificationText
              }
            }
          ]
        : []),
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: '*Database:*\n' + connection.name
          },
          {
            type: 'mrkdwn',
            text: '*Playbook:*\n' + schedule.playbook
          },
          {
            type: 'mrkdwn',
            text: '*Model:*\n' + schedule.model
          },
          {
            type: 'mrkdwn',
            text: '*Schedule:*\n' + (schedule.scheduleType === 'cron' ? schedule.cronExpression : 'Automatic')
          }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `I'll do the next check at *${schedule.nextRun}*`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            style: 'primary',
            text: {
              type: 'plain_text',
              text: 'Open in chat'
            },
            url: `${env.PUBLIC_URL}/projects/${schedule.projectId}/chats/new?scheduleRun=${run.id}`
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Run History'
            },
            url: `${env.PUBLIC_URL}/projects/${schedule.projectId}/monitoring/runs/${schedule.id}`
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Schedule Settings'
            },
            url: `${env.PUBLIC_URL}/projects/${schedule.projectId}/monitoring/schedule/${schedule.id}`
          }
        ]
      }
    ]
  };

  console.log(JSON.stringify(slackBlocks, null, 2));

  const response = await fetch(slack.webhookUrl, {
    method: 'POST',
    body: JSON.stringify(slackBlocks)
  });

  if (!response.ok) {
    console.error('Failed to send Slack notification:', await response.text());
  }
}
