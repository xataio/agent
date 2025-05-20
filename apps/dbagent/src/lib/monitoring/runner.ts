import { Message } from '@ai-sdk/ui-utils';
import { generateId, generateObject, generateText, LanguageModelV1 } from 'ai';
import { z } from 'zod';
import { getMonitoringModel, getMonitoringSystemPrompt } from '../ai/agent';
import { getTools } from '../ai/tools';
import { getConnectionFromSchedule } from '../db/connections';
import { DBAccess } from '../db/db';
import { getProjectById } from '../db/projects';
import { insertScheduleRunLimitHistory } from '../db/schedule-runs';
import { Connection, Project, Schedule } from '../db/schema';
import { sendScheduleNotification } from '../notifications/slack-webhook';
import { getTargetDbPool } from '../targetdb/db';
import { listPlaybooks } from '../tools/playbooks';

type RunModelPlaybookParams = {
  messages: Message[];
  modelInstance: LanguageModelV1;
  connection: Connection;
  schedule: Schedule;
  playbook: string;
  additionalInstructions?: string;
  project: Project;
};

async function runModelPlaybook({
  messages,
  modelInstance,
  connection,
  schedule,
  playbook,
  additionalInstructions,
  project
}: RunModelPlaybookParams) {
  messages.push({
    id: generateId(),
    role: 'user',
    content: `Run this playbook: ${playbook}. ${additionalInstructions ?? ''}`,
    createdAt: new Date()
  });

  const monitoringSystemPrompt = getMonitoringSystemPrompt({ cloudProvider: project.cloudProvider });
  const targetDb = getTargetDbPool(connection.connectionString);
  try {
    const tools = await getTools({ project, connection, targetDb, userId: schedule.userId });
    const result = await generateText({
      model: modelInstance,
      system: monitoringSystemPrompt,
      maxSteps: 20,
      tools,
      messages
    });

    messages.push({
      id: generateId(),
      role: 'assistant',
      content: result.text,
      createdAt: new Date()
    });

    return result;
  } finally {
    await targetDb.end();
  }
}

async function decideNotificationLevel(
  messages: Message[],
  modelInstance: LanguageModelV1,
  monitoringSystemPrompt: string
) {
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
    }),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        tags: ['monitoring', 'notification']
      }
    }
  });

  messages.push({
    id: generateId(),
    role: 'assistant',
    content: JSON.stringify(notificationResult.object),
    createdAt: new Date()
  });

  return notificationResult.object;
}

async function decideNextPlaybook(
  messages: Message[],
  schedule: Schedule,
  modelInstance: LanguageModelV1,
  monitoringSystemPrompt: string
) {
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
    }),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        tags: ['monitoring', 'playbook', 'select']
      }
    }
  });

  messages.push({
    id: generateId(),
    role: 'assistant',
    content: recommendPlaybookResult.object.recommendedPlaybook ?? 'No playbook recommended',
    createdAt: new Date()
  });

  return recommendPlaybookResult.object;
}

async function summarizeResult(messages: Message[], modelInstance: LanguageModelV1, monitoringSystemPrompt: string) {
  const prompt = `Summarize the results above and highlight what made you investigate, the root cause, and the recommended actions.
Be as specific as possible, like including the DDL to run. Use the following headers:

Trigger
Root Cause Analysis
Actions to take

In the Root cause analysis section, mention which playbooks you run.`;

  messages.push({
    id: generateId(),
    role: 'user',
    content: prompt,
    createdAt: new Date()
  });

  const summaryResult = await generateText({
    model: modelInstance,
    system: monitoringSystemPrompt,
    messages: messages,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        tags: ['monitoring', 'summary']
      }
    }
  });

  messages.push({
    id: generateId(),
    role: 'assistant',
    content: summaryResult.text,
    createdAt: new Date()
  });

  return summaryResult.text;
}

function shouldNotify(notifyLevel: 'alert' | 'warning' | 'info', notificationLevel: 'alert' | 'warning' | 'info') {
  const levelMap = {
    info: 1,
    warning: 2,
    alert: 3
  };
  return levelMap[notificationLevel] >= levelMap[notifyLevel];
}

export async function runSchedule(dbAccess: DBAccess, schedule: Schedule, now: Date) {
  console.log(`Running schedule ${schedule.id}`);

  const connection = await getConnectionFromSchedule(dbAccess, schedule);
  if (!connection) {
    throw new Error(`Connection ${schedule.connectionId} not found`);
  }
  const model = await getMonitoringModel(schedule.model);
  if (model.isFallback) {
    console.log(`Model id ${model.requestedModelId} not found, using fallback model ${model.info().id}`);
  }

  const modelInstance = model.instance();
  const messages: Message[] = [];
  const project = await getProjectById(dbAccess, connection.projectId);
  if (!project) {
    throw new Error(`Project ${connection.projectId} not found`);
  }
  const monitoringSystemPrompt = getMonitoringSystemPrompt({ cloudProvider: project.cloudProvider });
  const result = await runModelPlaybook({
    messages,
    modelInstance,
    connection,
    schedule,
    playbook: schedule.playbook,
    additionalInstructions: schedule.additionalInstructions ?? '',
    project
  });
  messages.push({
    id: generateId(),
    role: 'assistant',
    content: result.text,
    createdAt: new Date()
  });

  const notificationResult = await decideNotificationLevel(messages, modelInstance, monitoringSystemPrompt);
  console.log('notificationResult', notificationResult);

  // drilling down to more actionable playbooks
  if (schedule.maxSteps && shouldNotify(schedule.notifyLevel, notificationResult.notificationLevel)) {
    let step = 1;
    while (step < schedule.maxSteps) {
      const recommendPlaybookResult = await decideNextPlaybook(
        messages,
        schedule,
        modelInstance,
        monitoringSystemPrompt
      );
      if (!recommendPlaybookResult.shouldRunPlaybook || !recommendPlaybookResult.recommendedPlaybook) {
        break;
      }
      const nextPlaybook = recommendPlaybookResult.recommendedPlaybook;
      await runModelPlaybook({
        messages,
        modelInstance,
        connection,
        schedule,
        playbook: nextPlaybook,
        additionalInstructions: '',
        project
      });
      step++;
    }
  }

  const resultText = await summarizeResult(messages, modelInstance, monitoringSystemPrompt);

  // save the result in the database with all messages
  const run = await insertScheduleRunLimitHistory(
    dbAccess,
    {
      projectId: connection.projectId,
      scheduleId: schedule.id,
      result: resultText,
      summary: notificationResult.summary,
      notificationLevel: notificationResult.notificationLevel,
      messages: messages,
      createdAt: now // using the start time
    },
    schedule.keepHistory
  );

  if (shouldNotify(schedule.notifyLevel, notificationResult.notificationLevel)) {
    await sendScheduleNotification(
      dbAccess,
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
