'use client';

import { UseChatHelpers } from '@ai-sdk/react';
import { Button, cn, Code, Tooltip, TooltipContent, TooltipTrigger, Typography } from '@internal/components';
import type { UIMessage } from 'ai';
import equal from 'fast-deep-equal';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, PencilIcon, SparklesIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { MessageVote } from '~/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from '../artifacts/document';
import { DocumentPreview } from '../artifacts/document-preview';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { MessageEditor } from './message-editor';
import { MessageReasoning } from './message-reasoning';

const PurePreviewMessage = ({
  projectId,
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload
}: {
  projectId: string;
  chatId: string;
  message: UIMessage;
  vote: MessageVote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="group/message mx-auto w-full max-w-3xl md:px-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex w-full gap-4 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit'
            }
          )}
        >
          {message.role === 'assistant' && (
            <div className="ring-border bg-background flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex w-full flex-col gap-4">
            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return <MessageReasoning key={key} isLoading={isLoading} reasoning={part.reasoning} />;
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row items-start">
                      {message.role === 'user' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="text-muted-foreground h-fit rounded-full px-2 opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col', {
                          'bg-primary !text-primary-foreground rounded-xl px-3 py-2': message.role === 'user'
                        })}
                      >
                        {message.role === 'user' ? (
                          <Markdown>{part.text}</Markdown>
                        ) : (
                          <Typography>
                            <Markdown>{part.text}</Markdown>
                          </Typography>
                        )}
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row items-start gap-2">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-invocation') {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === 'call') {
                  const { args } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'createDocument' ? (
                        <DocumentPreview projectId={projectId} args={args} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolCall type="update" args={args} />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolCall type="request-suggestions" args={args} />
                      ) : (
                        <div className="text-muted-foreground mt-1 text-xs">
                          <Clock className="mr-1 inline-block h-4 w-4" />
                          Tool called: <Code>{part.toolInvocation.toolName}</Code>
                        </div>
                      )}
                    </div>
                  );
                }

                if (state === 'result') {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'createDocument' ? (
                        <DocumentPreview projectId={projectId} result={result} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolResult type="update" result={result} />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolResult type="request-suggestions" result={result} />
                      ) : (
                        <div className="text-muted-foreground mt-1 text-xs">
                          <Clock className="mr-1 inline-block h-4 w-4" />
                          Tool called: <Code>{part.toolInvocation.toolName}</Code>
                        </div>
                      )}
                    </div>
                  );
                }
              }
            })}

            <MessageActions
              key={`action-${message.id}`}
              chatId={chatId}
              message={message}
              vote={vote}
              isLoading={isLoading}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.projectId !== nextProps.projectId) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  if (!equal(prevProps.vote, nextProps.vote)) return false;

  return true;
});

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="group/message mx-auto w-full max-w-3xl"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cn(
          'flex w-full gap-4 rounded-xl group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:px-3 group-data-[role=user]/message:py-2',
          {
            'group-data-[role=user]/message:bg-muted': true
          }
        )}
      >
        <div className="ring-border flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <SparklesIcon size={14} />
        </div>

        <div className="flex w-full flex-col gap-2">
          <div className="text-muted-foreground flex flex-col gap-4">Hmm...</div>
        </div>
      </div>
    </motion.div>
  );
};
