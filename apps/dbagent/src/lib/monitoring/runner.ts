import { generateText } from 'ai';
import { Schedule } from '~/lib/db/schedules';
import { getModelInstance, getTools, monitoringSystemPrompt } from '../ai/aidba';
import { getConnection } from '../db/connections';
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

  console.log(result);
  console.log(result.text);
}
