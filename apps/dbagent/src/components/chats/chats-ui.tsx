'use client';

import { useChat } from '@ai-sdk/react';
import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Code,
  ScrollArea,
  Textarea
} from '@internal/components';
import { Clock, Lightbulb, Send, User, Wrench } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot } from '~/components/icons/bot';
import { Connection } from '~/lib/db/connections';
import { ScheduleRun } from '~/lib/db/schedule-runs';
import { Schedule } from '~/lib/db/schedules';
import { ChatSidebar } from './chat-sidebar';
import { ConnectionSelector } from './conn-selector';
import { mockChats } from './mock-data';
import { ModelSelector } from './model-selector';

export function ChatsUI({
  connections,
  scheduleRun
}: {
  connections: Connection[];
  scheduleRun?: { schedule: Schedule; run: ScheduleRun } | null;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatsUIContent connections={connections} scheduleRun={scheduleRun} />
    </Suspense>
  );
}

function ChatsUIContent({
  connections,
  scheduleRun
}: {
  connections: Connection[];
  scheduleRun?: { schedule: Schedule; run: ScheduleRun } | null;
}) {
  const searchParams = useSearchParams();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState(mockChats);
  const defaultConnection = connections.find((c) => c.isDefault);
  const [connectionId, setConnectionId] = useState<string>(
    scheduleRun?.schedule.connectionId || defaultConnection?.id || ''
  );
  const [model, setModel] = useState(scheduleRun?.schedule.model || 'openai-gpt-4o');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, setInput, status, setMessages } = useChat({
    id: selectedChatId || undefined,
    body: {
      model
    },
    initialMessages: scheduleRun?.run.messages
  });

  useEffect(() => {
    const startParam = searchParams.get('start');
    console.log('startParam', startParam);
    if (startParam === 'report' && defaultConnection?.id) {
      const newChat = {
        id: `new-${Date.now()}`,
        title: 'Initial Assessment',
        lastMessage: '',
        timestamp: new Date().toISOString()
      };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      setConnectionId(defaultConnection.id);
      setMessages([]);

      // Send initial assessment request
      const initialMessage =
        "Hi! I'd like an initial assessment of my database. Please analyze its configuration, settings, and current activity to provide recommendations for optimization and potential improvements.";
      setInput(initialMessage);
    }
  }, [searchParams, defaultConnection?.id]);

  useEffect(() => {
    const playbookParam = searchParams.get('playbook');
    if (playbookParam && defaultConnection?.id) {
      const newChat = {
        id: `new-${Date.now()}`,
        title: `Playbook: ${playbookParam}`,
        lastMessage: '',
        timestamp: new Date().toISOString()
      };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      setConnectionId(defaultConnection.id);
      setMessages([]);

      const initialMessage = `Run playbook ${playbookParam}`;
      setInput(initialMessage);
    }
  }, [searchParams, defaultConnection?.id]);

  /*useEffect(() => {
    const fetchScheduleRun = async (runId: string) => {
      const { schedule, run } = await actionGetScheduleRun(runId)      
      const newChat = {
        id: `new-${Date.now()}`,
        title: `Scheduled run followup`,
        lastMessage: run.summary || '',
        timestamp: new Date().toISOString()
      };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      setConnectionId(schedule.connectionId);
      setMessages(run.messages);
    };
    const runId = searchParams.get('runId');
    if (runId) {
      void fetchScheduleRun(runId);
    }
  }, [searchParams, defaultConnection?.id]);*/

  const handleNewChat = () => {
    const newChat = {
      id: `new-${Date.now()}`,
      title: 'New Conversation',
      lastMessage: '',
      timestamp: new Date().toISOString()
    };
    setChats([newChat, ...chats]);
    setSelectedChatId(newChat.id);
    setMessages([]);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setMessages([]); // In a real app, you'd load messages from the DB here
  };

  const handleMessageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !connectionId) return;

    if (selectedChatId) {
      // Update the last message in the chat list
      setChats(
        chats.map((chat) =>
          chat.id === selectedChatId ? { ...chat, lastMessage: input, timestamp: new Date().toISOString() } : chat
        )
      );
    }

    // Include the context in the message
    handleSubmit(e, {
      body: {
        connectionId,
        model,
        messages: [...messages, { role: 'user', content: input }]
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

  return (
    <div className="flex h-full flex-row-reverse">
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      <div className="flex-1 overflow-hidden">
        <Card className="mx-auto flex h-full max-w-5xl flex-col justify-between">
          <CardHeader className="border-b">
            <div className="flex flex-col justify-between">
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

          <ScrollArea className="h-[calc(100vh-25rem)] flex-1">
            <CardContent className="space-y-4 p-4">
              {connectionId && (
                <div className="text-muted-foreground mb-4 text-sm">
                  Current context: {connections.find((c) => c.id === connectionId)?.name} database
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className="space-y-4">
                  {message.parts.map((part, index) => (
                    <div
                      key={`${message.id}-${index}`}
                      className={`flex gap-3 ${message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}
                    >
                      <Avatar>
                        <AvatarFallback>
                          {part.type === 'text' && message.role === 'user' ? (
                            <User className="h-6 w-6" />
                          ) : part.type === 'text' ? (
                            <Bot className="h-6 w-6" />
                          ) : part.type === 'tool-invocation' ? (
                            <Wrench className="h-6 w-6" />
                          ) : part.type === 'reasoning' ? (
                            <Lightbulb className="h-6 w-6" />
                          ) : null}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`prose prose-sm max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground ml-auto'
                        }`}
                      >
                        {part.type === 'text' ? (
                          <ReactMarkdown
                            components={{
                              code: ({ children }) => <Code>{children}</Code>
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : part.type === 'tool-invocation' ? (
                          <div className="text-muted-foreground mt-1 text-xs">
                            <Clock className="mr-1 inline-block h-4 w-4" />
                            Tool called: <Code>{part.toolInvocation.toolName}</Code>
                          </div>
                        ) : part.type === 'reasoning' ? (
                          <div className="text-muted-foreground mt-1 text-xs">
                            <Clock className="mr-1 inline-block h-4 w-4" />
                            <Code>{part.type}</Code>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {status !== 'ready' && (
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarFallback>
                      <Bot className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted max-w-[80%] rounded-lg px-4 py-2">
                    <p className="text-sm">Thinking...</p>
                  </div>
                </div>
              )}
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
      </div>
    </div>
  );
}
