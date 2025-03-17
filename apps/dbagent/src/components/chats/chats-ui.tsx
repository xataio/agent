'use client';

import { useChat } from '@ai-sdk/react';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  ScrollArea,
  Textarea
} from '@internal/components';
import { Message } from 'ai';
import { Send } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Connection } from '~/lib/db/connections';
import { ScheduleRun } from '~/lib/db/schedule-runs';
import { Schedule } from '~/lib/db/schedules';
import {
  actionCreateChat,
  actionDeleteChat,
  actionGetChatMessages,
  actionListChats,
  actionUpdateChat
} from './actions';
import { ChatSidebar, ChatWithLastMessage } from './chat-sidebar';
import { ConnectionSelector } from './conn-selector';
import { MessageCard, ThinkingIndicator } from './message-card';
import { ModelSelector } from './model-selector';

function generateChatMessageID(): string {
  return crypto.randomUUID();
}

export function ChatsUI({
  connections,
  scheduleRun,
  projectId
}: {
  connections: Connection[];
  scheduleRun?: { schedule: Schedule; run: ScheduleRun } | null;
  projectId: string;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatsUIContent connections={connections} scheduleRun={scheduleRun} projectId={projectId} />
    </Suspense>
  );
}

function ChatsUIContent({
  connections,
  scheduleRun,
  projectId
}: {
  connections: Connection[];
  scheduleRun?: { schedule: Schedule; run: ScheduleRun } | null;
  projectId: string;
}) {
  const searchParams = useSearchParams();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatWithLastMessage[]>([]);
  const defaultConnection = connections.find((c) => c.isDefault);
  const [connectionId, setConnectionId] = useState<string>(
    scheduleRun?.schedule.connectionId || defaultConnection?.id || ''
  );
  const [model, setModel] = useState(scheduleRun?.schedule.model || 'openai-gpt-4o');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, setInput, status, setMessages } = useChat({
    id: selectedChatId || undefined,
    generateId: () => crypto.randomUUID(),
    body: {
      model
    },
    initialMessages: scheduleRun?.run.messages,
    sendExtraMessageFields: true,
    onFinish: async (message) => {
      if (selectedChatId) {
        try {
          // Update the last message in the UI
          setChats((prevChats) =>
            prevChats.map((chat) => (chat.id === selectedChatId ? { ...chat, lastMessage: message } : chat))
          );
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }
    }
  });

  // Load chats from the database
  useEffect(() => {
    const loadChats = async () => {
      try {
        const fetchedChats = await actionListChats(projectId);
        const chatWithLastMessages = await Promise.all(
          fetchedChats.map(async (chat) => {
            const messages = await actionGetChatMessages(chat.id, 1);
            const lastMessage = messages.length > 0 ? messages[0] : null;
            return { ...chat, lastMessage: lastMessage ?? null };
          })
        );
        setChats(chatWithLastMessages);

        // Find the last chat by most recent creation date
        const lastChat =
          chatWithLastMessages.length > 0
            ? chatWithLastMessages.reduce((latest, current) =>
                new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
              )
            : null;

        if (lastChat) {
          await handleSelectChat(lastChat.id);
        } else {
          await handleNewChat();
        }
      } catch (error) {
        console.error('Failed to load chats:', error);
      }
    };

    void loadChats();
  }, [projectId]);

  useEffect(() => {
    const startParam = searchParams.get('start');
    if (startParam === 'report' && defaultConnection?.id) {
      void handleNewChat('Initial Assessment', defaultConnection.id);

      // Send initial assessment request
      const initialMessage =
        "Hi! I'd like an initial assessment of my database. Please analyze its configuration, settings, and current activity to provide recommendations for optimization and potential improvements.";
      setInput(initialMessage);
    }
  }, [searchParams, defaultConnection?.id]);

  useEffect(() => {
    const playbookParam = searchParams.get('playbook');
    if (playbookParam && defaultConnection?.id) {
      void handleNewChat(`Playbook: ${playbookParam}`, defaultConnection.id);

      const initialMessage = `Run playbook ${playbookParam}`;
      setInput(initialMessage);
    }
  }, [searchParams, defaultConnection?.id]);

  const handleNewChat = async (title: string = 'New Conversation', connectionId?: string) => {
    // Create a properly typed new chat object
    const newChat = await actionCreateChat(projectId, title, connectionId);
    setChats([{ ...newChat, lastMessage: null }, ...chats]);
    setSelectedChatId(newChat.id);
    setMessages([]);
  };

  const handleDeleteChat = async (chatId: string) => {
    await actionDeleteChat(projectId, chatId);
    setChats(chats.filter((c) => c.id !== chatId));
    if (selectedChatId === chatId) {
      const nextChatId = chats.filter((c) => c.id !== chatId)[0]?.id ?? null;
      if (nextChatId) {
        await handleSelectChat(nextChatId);
      } else {
        await handleNewChat();
      }
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    try {
      // Update connection ID if the chat has one
      const selectedChat = chats.find((c) => c.id === chatId);
      if (selectedChat?.connectionId) {
        setConnectionId(selectedChat.connectionId);
      }

      // Load messages for the selected chat
      const messages = await actionGetChatMessages(chatId);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      setMessages([]);
    }
  };

  const handleMessageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !connectionId || !selectedChatId) return;

    const id = generateChatMessageID();
    const newUserMessage: Message = {
      id: id,
      role: 'user',
      content: input
    };

    try {
      if (selectedChatId) {
        // Update the last message in the chat list
        setChats(
          chats.map((chat) =>
            chat.id === selectedChatId
              ? { ...chat, lastMessage: newUserMessage, timestamp: new Date().toISOString() }
              : chat
          )
        );
      }

      // Update the last message in the UI
      setChats((prevChats) =>
        prevChats.map((chat) => (chat.id === selectedChatId ? { ...chat, lastMessage: newUserMessage } : chat))
      );
    } catch (error) {
      console.error('Failed to update chat:', error);
    }

    // Include the context in the message for the AI SDK
    handleSubmit(e, {
      body: {
        connectionId,
        model,
        chatId: selectedChatId,
        history: messages,
        messages: [newUserMessage]
      }
    });
  };

  const handleContextSelect = (connectionId: string) => {
    setConnectionId(connectionId);
    // In a real application, you might want to update the chat or reload data based on the new context
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleTitleEdit = async (newTitle: string) => {
    if (!selectedChatId) return;

    try {
      // Update the title in the database
      await actionUpdateChat(projectId, selectedChatId, { title: newTitle });

      // Update the title in the UI
      setChats((prevChats) =>
        prevChats.map((chat) => (chat.id === selectedChatId ? { ...chat, title: newTitle } : chat))
      );
    } catch (error) {
      console.error('Failed to update chat title:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-row-reverse">
      <div className="w-80 flex-none">
        <ChatSidebar
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onNewChat={() => void handleNewChat()}
          onDelete={handleDeleteChat}
        />
      </div>

      <main className="flex-1 overflow-hidden">
        <Card className="mx-auto h-[calc(100vh-5.5rem)] max-w-5xl">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <ChatTitle
                title={chats.find((chat) => chat.id === selectedChatId)?.title || 'New Conversation'}
                onEdit={selectedChatId ? handleTitleEdit : undefined}
              />

              <div className="flex items-center gap-2">
                <ModelSelector value={model} onValueChange={setModel} />
                <ConnectionSelector
                  connections={connections}
                  onSelect={handleContextSelect}
                  connectionId={connectionId}
                />
              </div>
            </div>
          </CardHeader>

          <ScrollArea className="h-[calc(100vh-19.5rem)] flex-1">
            <CardContent className="space-y-4 p-4">
              {connectionId && (
                <div className="text-muted-foreground mb-4 text-sm">
                  Current context: {connections.find((c) => c.id === connectionId)?.name} database
                </div>
              )}
              {messages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
              {status !== 'ready' && <ThinkingIndicator />}
              <div ref={messagesEndRef} />
            </CardContent>
          </ScrollArea>

          <CardFooter className="border-t p-4">
            <form onSubmit={handleMessageSubmit} className="flex w-full gap-2">
              <Textarea
                placeholder={
                  !selectedChatId
                    ? 'Select or start a new chat to begin'
                    : !connectionId
                      ? 'Select a database context before typing'
                      : 'Type your message...'
                }
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && selectedChatId && connectionId) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }
                }}
                disabled={status != 'ready' || !connectionId}
                className="min-h-[100px] flex-1 resize-none"
              />
              <Button type="submit" disabled={status != 'ready' || !input.trim() || !connectionId}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

function ChatTitle({ title, onEdit }: { title: string; onEdit?: (newTitle: string) => Promise<void> | void }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  return (
    <CardTitle>
      {onEdit ? (
        isEditingTitle ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onEdit(editedTitle);
              setIsEditingTitle(false);
            }}
            className="flex"
          >
            <Input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="mr-2 rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onBlur={() => {
                void onEdit(editedTitle);
                setIsEditingTitle(false);
              }}
            />
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        ) : (
          <button
            onClick={() => {
              setEditedTitle(title);
              setIsEditingTitle(true);
            }}
            className="cursor-pointer border-none bg-transparent p-0 text-left text-lg font-semibold hover:underline"
            aria-label="Edit chat title"
          >
            {title}
          </button>
        )
      ) : (
        'Select or start a new chat'
      )}
    </CardTitle>
  );
}
