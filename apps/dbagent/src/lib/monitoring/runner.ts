import { Message } from '@ai-sdk/ui-utils';
import { generateId, generateObject, generateText, LanguageModelV1 } from 'ai';
import { Client } from 'pg';
import { z } from 'zod';
import { getModelInstance, getTools, monitoringSystemPrompt } from '../ai/aidba';
import { DbConnection, getConnection } from '../db/connections';
import { insertScheduleRunLimitHistory, ScheduleRun } from '../db/runs';
import { Schedule } from '../db/schedules';
import { sendScheduleNotification } from '../notifications/slack-webhook';
import { getTargetDbConnection } from '../targetdb/db';
import { listPlaybooks } from '../tools/playbooks';

async function runModelPlaybook(
  messages: Message[],
  modelInstance: LanguageModelV1,
  connection: DbConnection,
  targetClient: Client,
  playbook: string,
  additionalInstructions?: string
) {
  messages.push({
    id: generateId(),
    role: 'user',
    content: `Run this playbook: ${playbook}. ${additionalInstructions ?? ''}`,
    createdAt: new Date()
  });

  const result = await generateText({
    model: modelInstance,
    system: monitoringSystemPrompt,
    messages: messages,
    tools: await getTools(connection, targetClient),
    maxSteps: 20
  });

  messages.push({
    id: generateId(),
    role: 'assistant',
    content: result.text,
    createdAt: new Date()
  });

  return result;
}

async function decideNotificationLevel(messages: Message[], modelInstance: LanguageModelV1) {
  const prompt = `Decide a level of notification for the previous result of the playbook run. Choose one of these levels:

info: Everything is fine, no action is needed.
warning: Some issues were found, but nothing that requires immediate attention.
alert: We need immediate action.

Also provide a one sentence summary of the result. It can be something like "No issues found" or "Some issues were found".
`;
  messages.push({
    id: generateId(),
    role: 'user',
    content: prompt,
    createdAt: new Date()
  });

  const notificationResult = await generateObject({
    model: modelInstance,
    system: monitoringSystemPrompt,
    messages: messages,
    schema: z.object({
      summary: z.string(),
      notificationLevel: z.enum(['info', 'warning', 'alert'])
    })
  });

  messages.push({
    id: generateId(),
    role: 'assistant',
    content: notificationResult.object.summary,
    createdAt: new Date()
  });

  return notificationResult.object;
}

async function decideNextPlaybook(messages: Message[], schedule: Schedule, modelInstance: LanguageModelV1) {
  const prompt = `Based on the previous conversation, would you recommend running another specific playbook.
These are the playbooks you can choose from: ${listPlaybooks().join(', ')}.
As you choose the next playbook remember your goals: if the root cause is not clear yet, try to drill down to the root cause. If the root cause is clear, 
get actionable steps to fix the issue.
Return:
- Whether we should run another playbook (boolean)
- Which playbook to run (string, optional)
    `;

  messages.push({
    id: generateId(),
    role: 'user',
    content: prompt,
    createdAt: new Date()
  });

  const recommendPlaybookResult = await generateObject({
    model: modelInstance,
    system: monitoringSystemPrompt,
    messages: messages,
    schema: z.object({
      shouldRunPlaybook: z.boolean(),
      recommendedPlaybook: z.string().optional()
    })
  });

  messages.push({
    id: generateId(),
    role: 'assistant',
    content: recommendPlaybookResult.object.recommendedPlaybook ?? 'No playbook recommended',
    createdAt: new Date()
  });

  return recommendPlaybookResult.object;
}

function shouldNotify(notifyLevel: 'alert' | 'warning' | 'info', notificationLevel: 'alert' | 'warning' | 'info') {
  const levelMap = {
    info: 1,
    warning: 2,
    alert: 3
  };
  return levelMap[notificationLevel] >= levelMap[notifyLevel];
}

export async function runSchedule(schedule: Schedule, now: Date) {
  console.log(`Running schedule ${schedule.id}`);

  const connection = await getConnection(schedule.connectionId);
  if (!connection) {
    throw new Error(`Connection ${schedule.connectionId} not found`);
  }
  const targetClient = await getTargetDbConnection(connection.connstring);
  const modelInstance = getModelInstance(schedule.model);
  const messages: Message[] = [];

  const result = await runModelPlaybook(
    messages,
    modelInstance,
    connection,
    targetClient,
    schedule.playbook,
    schedule.additionalInstructions ?? ''
  );
  messages.push({
    id: generateId(),
    role: 'assistant',
    content: result.text,
    createdAt: new Date()
  });
  let resultText = result.text;

  const notificationResult = await decideNotificationLevel(messages, modelInstance);

  // drilling down to more actionable playbooks
  if (schedule.maxSteps && shouldNotify(schedule.notifyLevel, notificationResult.notificationLevel)) {
    let step = 1;
    while (step < schedule.maxSteps) {
      const recommendPlaybookResult = await decideNextPlaybook(messages, schedule, modelInstance);
      if (!recommendPlaybookResult.shouldRunPlaybook || !recommendPlaybookResult.recommendedPlaybook) {
        break;
      }
      const nextPlaybook = recommendPlaybookResult.recommendedPlaybook;
      const resultNewPlaybook = await runModelPlaybook(
        messages,
        modelInstance,
        connection,
        targetClient,
        nextPlaybook,
        ''
      );
      resultText = `${resultText}
      -------
      To investigate the issue further, I've ran the following playbook: ${nextPlaybook}

      With these results:
      ${resultNewPlaybook.text}`;
      step++;
    }
  }

  // TODO: summarize the result

  // save the result in the database with all messages
  const scheduleRun: Omit<ScheduleRun, 'id'> = {
    scheduleId: schedule.id,
    result: resultText,
    summary: notificationResult.summary,
    notificationLevel: notificationResult.notificationLevel,
    messages: messages,
    createdAt: now.toISOString() // using the start time
  };
  const run = await insertScheduleRunLimitHistory(scheduleRun, schedule.keepHistory);

  if (shouldNotify(schedule.notifyLevel, notificationResult.notificationLevel)) {
    await sendScheduleNotification(
      run,
      schedule,
      connection,
      notificationResult.notificationLevel,
      notificationResult.summary,
      resultText,
      schedule.extraNotificationText ?? undefined
    );
  }
}
