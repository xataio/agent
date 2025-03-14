'use client';

import { Avatar, AvatarFallback } from '@internal/components';
import { Message } from 'ai';
import { Bot, Clock, Lightbulb, User, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageCardProps {
  message: Message;
}

export function MessageCard({ message }: MessageCardProps) {
  return (
    <div className="space-y-4">
      {message.parts?.map((part, index) => (
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
              <MarkdownRenderer content={part.text} />
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
      )) ?? (
        <div className={`flex gap-3 ${message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}>
          <Avatar>
            <AvatarFallback>
              {message.role === 'user' ? <User className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === 'assistant' ? 'bg-secondary' : 'bg-primary text-primary-foreground ml-auto'
            }`}
          >
            <MarkdownRenderer content={message.content} />
          </div>
        </div>
      )}
    </div>
  );
}

// Create a separate component for the markdown renderer to reduce duplication
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 text-sm last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-inside list-disc text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-inside list-decimal text-sm">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 text-base font-medium">{children}</h3>,
        code: ({ children }) => (
          <code className="rounded bg-black px-1 py-0.5 font-mono text-sm text-white">{children}</code>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// Also create a ThinkingIndicator component for the "Thinking..." state
export function ThinkingIndicator() {
  return (
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
  );
}
