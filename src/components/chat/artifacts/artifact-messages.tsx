import { UseChatHelpers } from '@ai-sdk/react';
import { UIMessage } from 'ai';
import equal from 'fast-deep-equal';
import { memo } from 'react';
import { MessageVote } from '~/lib/db/schema';
import { PreviewMessage } from '../message';
import { useScrollToBottom } from '../use-scroll-to-bottom';
import { UIArtifact } from './artifact';

interface ArtifactMessagesProps {
  projectId: string;
  chatId: string;
  status: UseChatHelpers['status'];
  votes: Array<MessageVote> | undefined;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  artifactStatus: UIArtifact['status'];
}

function PureArtifactMessages({
  projectId,
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload
}: ArtifactMessagesProps) {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div ref={messagesContainerRef} className="flex h-full flex-col items-center gap-4 overflow-y-scroll px-4 pt-20">
      {messages.map((message, index) => (
        <PreviewMessage
          projectId={projectId}
          chatId={chatId}
          key={message.id}
          message={message}
          isLoading={status === 'streaming' && index === messages.length - 1}
          vote={votes ? votes.find((vote) => vote.messageId === message.id) : undefined}
          setMessages={setMessages}
          reload={reload}
        />
      ))}

      <div ref={messagesEndRef} className="min-h-[24px] min-w-[24px] shrink-0" />
    </div>
  );
}

function areEqual(prevProps: ArtifactMessagesProps, nextProps: ArtifactMessagesProps) {
  if (prevProps.artifactStatus === 'streaming' && nextProps.artifactStatus === 'streaming') return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.status && nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;

  return true;
}

export const ArtifactMessages = memo(PureArtifactMessages, areEqual);
