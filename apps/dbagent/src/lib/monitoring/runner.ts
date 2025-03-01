import { Message } from '@ai-sdk/ui-utils';
import { CoreMessage, generateId, generateObject, generateText } from 'ai';
import { z } from 'zod';
import { Schedule } from '~/lib/db/schedules';
import { getModelInstance, getTools, monitoringSystemPrompt } from '../ai/aidba';
import { getConnection } from '../db/connections';
import { insertScheduleRunLimitHistory, ScheduleRun } from '../db/runs';
import { sendScheduleNotification } from '../notifications/slack-webhook';
import { getTargetDbConnection } from '../targetdb/db';

export async function runSchedule(schedule: Schedule, now: Date) {
  console.log(`Running schedule ${schedule.id}`);

  const connection = await getConnection(schedule.connectionId);
  if (!connection) {
    throw new Error(`Connection ${schedule.connectionId} not found`);
  }

  const targetClient = await getTargetDbConnection(connection.connstring);

  const modelInstance = getModelInstance(schedule.model);

  const messages = [
    {
      role: 'user',
      content: `Run this playbook: ${schedule.playbook}`
    }
  ] as CoreMessage[];

  if (schedule.additionalInstructions) {
    messages.push({
      role: 'user',
      content: schedule.additionalInstructions
    });
  }

  const result = await generateText({
    model: modelInstance,
    system: monitoringSystemPrompt,
    messages: messages,
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

  if (notificationResult.object.notificationLevel === 'alert') {
    await sendScheduleNotification(
      schedule,
      connection,
      notificationResult.object.notificationLevel,
      notificationResult.object.summary,
      result.text
    );
  }

  const msgs = messages.map((m) => {
    return {
      id: generateId(),
      role: m.role,
      content: m.content,
      createdAt: now
    } as Message;
  });
  msgs.push({
    id: generateId(),
    role: 'assistant',
    content: result.text,
    createdAt: new Date()
  } as Message);

  const scheduleRun: Omit<ScheduleRun, 'id'> = {
    scheduleId: schedule.id,
    result: result.text,
    summary: notificationResult.object.summary,
    notificationLevel: notificationResult.object.notificationLevel,
    messages: msgs,
    createdAt: now.toISOString()
  };
  await insertScheduleRunLimitHistory(scheduleRun, schedule.keepHistory);
}
