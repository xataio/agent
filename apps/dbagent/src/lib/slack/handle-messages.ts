import type {
  AssistantThreadStartedEvent,
  GenericMessageEvent,
} from "@slack/web-api";
import { client, getThread, updateStatusUtil } from "./utils";
import { generateResponse } from "./generate-response";
import { getOrCreateSlackUser, getOrCreateSlackConversation, getMemoryValue } from "../db/slack";

export async function assistantThreadMessage(
  event: AssistantThreadStartedEvent,
) {
  const { channel_id, thread_ts } = event.assistant_thread;
  console.log(`Thread started: ${channel_id} ${thread_ts}`);

  await client.chat.postMessage({
    channel: channel_id,
    thread_ts: thread_ts,
    text: "Hello! I'm your AI database expert. I can help you manage and optimize your PostgreSQL database. Which project would you like to work with?",
  });

  await client.assistant.threads.setSuggestedPrompts({
    channel_id: channel_id,
    thread_ts: thread_ts,
    prompts: [
      {
        title: "List my projects",
        message: "Show me my available projects",
      },
      {
        title: "Check database health",
        message: "Check the health of my database",
      },
      {
        title: "Optimize queries",
        message: "Help me optimize my slow queries",
      },
    ],
  });
}

export async function handleNewAssistantMessage(
  event: GenericMessageEvent,
  botUserId: string,
) {
  if (
    event.bot_id ||
    event.bot_id === botUserId ||
    event.bot_profile ||
    !event.thread_ts
  )
    return;

  const { thread_ts, channel, user, team } = event;
  const updateStatus = updateStatusUtil(channel, thread_ts);
  updateStatus("is thinking...");

  // Get or create user record
  const slackUser = await getOrCreateSlackUser(user!, team ?? '');
  if (!slackUser) {
    return await client.chat.postMessage({
      channel: channel,
      thread_ts: thread_ts,
      text: "Error: User not found",
    });
  }

  // Get conversation context
  const projectId = await getMemoryValue<string>(slackUser.id, channel, 'currentProjectId');
  if (!projectId) {
    return await client.chat.postMessage({
      channel: channel,
      thread_ts: thread_ts,
      text: "Please set up a project first by saying 'use project <project_name>'"
    });
  }

  // Get or create conversation record
  const conversation = await getOrCreateSlackConversation(channel, team ?? '', projectId);
  if (!conversation) {
    return await client.chat.postMessage({
      channel: channel,
      thread_ts: thread_ts,
      text: "Error: Conversation not found",
    });
  }


  const messages = await getThread(channel, thread_ts, botUserId);
  const result = await generateResponse(messages, conversation.id);

  await client.chat.postMessage({
    channel: channel,
    thread_ts: thread_ts,
    text: result,
    unfurl_links: false,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: result,
        },
      },
    ],
  });

  updateStatus("");
}
