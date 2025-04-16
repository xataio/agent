'use client';

import { Button, cn, Switch, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@internal/components';
import { Globe2Icon, PlusIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { memo, useState } from 'react';
import { Connection, Visibility } from '~/lib/db/schema';
import { ConnectionSelector } from './connection-selector';
import { ModelSelector } from './model-selector';

function PureChatHeader({
  chatId,
  connections,
  model,
  setModel,
  connectionId,
  setConnectionId,
  visibility = 'private',
  onVisibilityChange,
  className
}: {
  chatId: string;
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
  const { project } = useParams<{ project: string }>();
  const [isPublic, setIsPublic] = useState(visibility === 'public');

  const handleVisibilityToggle = async () => {
    const newVisibility = isPublic ? 'private' : 'public';
    setIsPublic(!isPublic);

    try {
      const response = await fetch(`/api/chat?id=${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visibility: newVisibility })
      });

      if (!response.ok) {
        throw new Error('Failed to update chat visibility');
      }

      if (onVisibilityChange) {
        onVisibilityChange(newVisibility);
      }
    } catch (error) {
      console.error('Error updating chat visibility:', error);
      // Revert the toggle if update fails
      setIsPublic(visibility === 'public');
    }
  };

  return (
    <header className={cn('flex items-center gap-2 px-2 py-1.5 md:px-2', className)}>
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

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Globe2Icon className={cn('h-4 w-4', isPublic ? 'text-blue-500' : 'text-gray-400')} />
              <Switch checked={isPublic} onCheckedChange={handleVisibilityToggle} aria-label="Toggle chat visibility" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isPublic ? 'Chat is public - anyone with the link can view' : 'Chat is private'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
