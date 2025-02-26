import { DbConnection } from '../db/connections';
import { getIntegration } from '../db/integrations';
import { Schedule } from '../db/schedules';
import { env } from '../env/general';

export type NotificationLevel = 'info' | 'warning' | 'alert';

export async function sendScheduleNotification(
  schedule: Schedule,
  connection: DbConnection,
  level: NotificationLevel,
  title: string,
  message: string
) {
  const slack = await getIntegration('slack');
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
            text: {
              type: 'plain_text',
              text: 'View Schedule Settings'
            },
            url: `${env.PUBLIC_URL}/monitoring/schedule/${schedule.id}`
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
