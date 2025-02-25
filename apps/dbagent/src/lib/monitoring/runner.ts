import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { Schedule } from '~/lib/db/schedules';
import { getModelInstance, getTools, monitoringSystemPrompt } from '../ai/aidba';
import { getConnection } from '../db/connections';
import { sendScheduleNotification } from '../notifications/slack-webhook';
import { getTargetDbConnection } from '../targetdb/db';

export async function runSchedule(schedule: Schedule) {
  console.log(`Running schedule ${schedule.id}`);

  const connection = await getConnection(Number(schedule.connectionId));
  if (!connection) {
    throw new Error(`Connection ${schedule.connectionId} not found`);
  }

  const targetClient = await getTargetDbConnection(connection.connstring);

  const modelInstance = getModelInstance(schedule.model);

  const result = await generateText({
    model: modelInstance,
    system: monitoringSystemPrompt,
    messages: [
      {
        role: 'user',
        content: `Run this playbook: ${schedule.playbook}`
      },
      {
        role: 'user',
        content: schedule.additionalInstructions ?? ''
      }
    ],
    tools: await getTools(connection, targetClient),
    maxSteps: 20
  });

  console.log(result.text);

  const notificationResult = await generateObject({
    model: modelInstance,
    schema: z.object({
      summary: z.string(),
      notificationLevel: z.enum(['info', 'warning', 'alert'])
    }),
    prompt: `Decide a level of notification for the following 
    result of a playbook run. Choose one of these levels:

    info: Everything is fine, no action is needed.
    warning: Some issues were found, but nothing that requires immediate attention.
    alert: We need immediate action.

    Also provide a one sentence summary of the result. It can be something like "No issues found" or "Some issues were found".

    Playbook: ${schedule.playbook}
    Result: ${result.text}`
  });

  console.log(JSON.stringify(notificationResult.object, null, 2));

  await sendScheduleNotification(
    schedule,
    connection,
    notificationResult.object.notificationLevel,
    notificationResult.object.summary,
    result.text
  );
}
