'use client';

import { Button } from '@internal/components';
import { useParams, useRouter } from 'next/navigation';
import { memo } from 'react';
import { Connection } from '~/lib/db/schema';
import { PlusIcon } from '../icons';
import { ConnectionSelector } from './connection-selector';
import { ModelSelector } from './model-selector';

function PureChatHeader({
  connections,
  model,
  setModel,
  connectionId,
  setConnectionId
}: {
  model: string;
  setModel: (model: string) => void;
  connections: Connection[];
  connectionId: string;
  setConnectionId: (connectionId: string) => void;
}) {
  const router = useRouter();
  const { project } = useParams<{ project: string }>();

  return (
    <header className="bg-background sticky top-0 flex items-center gap-2 px-2 py-1.5 md:px-2">
      <Button
        variant="outline"
        className="ml-auto px-2 md:ml-0 md:h-fit md:px-2"
        onClick={() => {
          router.push(`/projects/${project}/chats/new`);
        }}
      >
        <PlusIcon />
        <span className="md:sr-only">New Chat</span>
      </Button>

      <ModelSelector value={model} onValueChange={setModel} />

      <ConnectionSelector connections={connections} setConnectionId={setConnectionId} connectionId={connectionId} />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.connections === nextProps.connections &&
    prevProps.model === nextProps.model &&
    prevProps.connectionId === nextProps.connectionId
  );
});
