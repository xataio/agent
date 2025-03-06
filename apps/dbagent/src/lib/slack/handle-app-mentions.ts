import { AppMentionEvent } from "@slack/web-api";
import { getOrCreateSlackUser, getOrCreateSlackConversation, getMemoryValue, setMemoryValue } from "../db/slack";
import { client, getThread } from "./utils";
import { generateResponse } from "./generate-response";

const updateStatusUtil = async (
  initialStatus: string,
  event: AppMentionEvent,
) => {
  const initialMessage = await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: initialStatus,
  });

  if (!initialMessage || !initialMessage.ts)
    throw new Error("Failed to post initial message");

  const updateMessage = async (status: string) => {
    await client.chat.update({
      channel: event.channel,
      ts: initialMessage.ts as string,
      text: status,
    });
  };
  return updateMessage;
};

export async function handleNewAppMention(
  event: AppMentionEvent,
  botUserId: string,
) {
  console.log("Handling app mention");
  if (event.bot_id || event.bot_id === botUserId || event.bot_profile) {
    console.log("Skipping app mention");
    return;
  }

  const { thread_ts, channel, user, team } = event;

  // Get or create user record
  const slackUser = await getOrCreateSlackUser(user!, team ?? '');
  if (!slackUser) {
    return await client.chat.postMessage({
      channel: channel,
      thread_ts: thread_ts ?? event.ts,
      text: "Error: User not found"
    });
  }

  // Get conversation context
  const projectId = await getMemoryValue<string>(slackUser.id, channel, 'currentProjectId');
  if (!projectId) {
    return await client.chat.postMessage({
      channel: event.channel,
      thread_ts: thread_ts ?? event.ts,
      text: "Please set up a project first by saying 'use project <project_name>'"
    });
  }

  // Get or create conversation record
  const conversation = await getOrCreateSlackConversation(channel, team ?? '', projectId);
  if (!conversation) {
    return await client.chat.postMessage({
      channel: channel,
      thread_ts: thread_ts ?? event.ts,
      text: "Error: Conversation not found",
    });
  }

  const updateMessage = await updateStatusUtil("is thinking...", event);

  if (thread_ts) {
    const messages = await getThread(channel, thread_ts, botUserId);
    const result = await generateResponse(messages, conversation.id);
    updateMessage(result);
  } else {
    const result = await generateResponse([{ role: "user", content: event.text }], conversation.id);
    updateMessage(result);
  }
}
