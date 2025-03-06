import { CoreMessage, generateText } from "ai";
import { chatSystemPrompt, getModelInstance, getTools } from "../ai/aidba";
import { getConnection } from "../db/connections";
import { getTargetDbConnection } from "../targetdb/db";

export const generateResponse = async (
  messages: CoreMessage[],
) => {
  const connection = await getConnection(connectionId);
  if (!connection) {
    throw new Error("Connection not found");
  }
  const targetClient = await getTargetDbConnection(connection.connectionString);

  const { text } = await generateText({
    model: getModelInstance("openai-gpt-4o"),
    messages,
    system: chatSystemPrompt,
    tools: await getTools(connection, targetClient),
    maxSteps: 20,
  });

  // Convert markdown to Slack mrkdwn format
  return text.replace(/\[(.*?)\]\((.*?)\)/g, "<$2|$1>").replace(/\*\*/g, "*");
};
