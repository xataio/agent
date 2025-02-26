'use client';

import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  ScrollArea,
  Textarea
} from '@internal/components';
import { useChat } from 'ai/react';
import { Bot, Clock, Lightbulb, Send, User, Wrench } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { DbConnection } from '~/lib/db/connections';
import { ChatSidebar } from './chat-sidebar';
import { ConnectionSelector } from './conn-selector';
import { mockChats } from './mock-data';
import { ModelSelector } from './model-selector';

export function ChatsUI({ connections }: { connections: DbConnection[] }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatsUIContent connections={connections} />
    </Suspense>
  );
}

function ChatsUIContent({ connections }: { connections: DbConnection[] }) {
  const searchParams = useSearchParams();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState(mockChats);
  const defaultConnection = connections.find((c) => c.is_default);
  const [connectionId, setConnectionId] = useState<number>(defaultConnection?.id || 0);
  const [model, setModel] = useState('openai-gpt-4o');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading, setMessages } = useChat({
    id: selectedChatId || undefined,
    body: {
      model
    }
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

  const handleContextSelect = (connectionId: number) => {
    setConnectionId(connectionId);
    // In a real application, you might want to update the chat or reload data based on the new context
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-row-reverse">
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      <main className="flex-1 overflow-hidden">
        <Card className="mx-auto h-[calc(100vh-5.5rem)] max-w-5xl">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedChatId
                  ? chats.find((chat) => chat.id === selectedChatId)?.title || 'New Conversation'
                  : 'Select or start a new chat'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <ModelSelector value={model} onValueChange={setModel} />
                <ConnectionSelector connections={connections} onSelect={handleContextSelect} />
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
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'assistant' ? 'bg-secondary' : 'bg-primary text-primary-foreground ml-auto'
                        }`}
                      >
                        {part.type === 'text' ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 text-sm last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="mb-2 list-inside list-disc text-sm">{children}</ul>,
                              ol: ({ children }) => (
                                <ol className="mb-2 list-inside list-decimal text-sm">{children}</ol>
                              ),
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
                              h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>,
                              h3: ({ children }) => <h3 className="mb-2 text-base font-medium">{children}</h3>,
                              code: ({ children }) => (
                                <code className="rounded bg-black px-1 py-0.5 font-mono text-sm text-white">
                                  {children}
                                </code>
                              )
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : part.type === 'tool-invocation' ? (
                          <div className="text-muted-foreground mt-1 text-xs">
                            <Clock className="mr-1 inline-block h-4 w-4" />
                            Tool called: {part.toolInvocation.toolName}
                          </div>
                        ) : part.type === 'reasoning' ? (
                          <div className="text-muted-foreground mt-1 text-xs">
                            <Clock className="mr-1 inline-block h-4 w-4" />
                            {part.type}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarFallback>
                      <Bot className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-secondary max-w-[80%] rounded-lg px-4 py-2">
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
                    if (!isLoading && input.trim() && selectedChatId && connectionId) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }
                }}
                disabled={isLoading || !connectionId}
                className="min-h-[100px] flex-1 resize-none"
              />
              <Button type="submit" disabled={isLoading || !input.trim() || !connectionId}>
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
