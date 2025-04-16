'use client';

import { Button, cn } from '@internal/components';
import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo } from 'react';
import { Connection, Visibility } from '~/lib/db/schema';
import { ConnectionSelector } from './connection-selector';
import { ModelSelector } from './model-selector';
import { VisibilitySelector } from './visibility-selector';

function PureChatHeader({
  chatId,
  projectId,
  connections,
  model,
  setModel,
  connectionId,
  setConnectionId,
  className
}: {
  chatId: string;
  projectId: string;
  model: string;
  setModel: (model: string) => void;
  connections: Connection[];
  connectionId: string;
  setConnectionId: (connectionId: string) => void;
  visibility?: Visibility;
  onVisibilityChange?: (visibility: Visibility) => void;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header className={cn('flex items-center gap-2 px-2 py-1.5 md:px-2', className)}>
      <Button
        variant="outline"
        className="ml-auto px-2 md:ml-0 md:h-fit md:px-2"
        onClick={() => {
          router.push(`/projects/${projectId}/chats/new`);
        }}
      >
        <PlusIcon />
        <span className="md:sr-only">New Chat</span>
      </Button>

      <VisibilitySelector chatId={chatId} />

      <div className="flex-1" />

      <ModelSelector value={model} onValueChange={setModel} />

      <ConnectionSelector connections={connections} setConnectionId={setConnectionId} connectionId={connectionId} />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.projectId === nextProps.projectId &&
    prevProps.chatId === nextProps.chatId &&
    prevProps.connections === nextProps.connections &&
    prevProps.model === nextProps.model &&
    prevProps.connectionId === nextProps.connectionId
  );
});
