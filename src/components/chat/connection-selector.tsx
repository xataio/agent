'use client';

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@xata.io/components';
import { CheckCircleIcon, ChevronDownIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Connection } from '~/lib/db/schema';

export function ConnectionSelector({
  connections,
  setConnectionId,
  connectionId
}: {
  connections: Connection[];
  setConnectionId: (id: string) => void;
  connectionId?: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedConnection = useMemo(
    () => connections.find((conn) => conn.id === connectionId),
    [connections, connectionId]
  );

  useEffect(() => {
    if (!connectionId) {
      const defaultConnection = connections.find((conn) => conn.isDefault);
      if (defaultConnection) {
        setConnectionId(defaultConnection.id);
      }
    }
  }, [connectionId, connections]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn('data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-fit')}
      >
        <Button data-testid="connection-selector" variant="outline" className="md:h-[34px] md:px-2">
          {selectedConnection?.name || 'Select a database connection'}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {connections.map((conn) => {
          const { id, name } = conn;

          return (
            <DropdownMenuItem
              data-testid={`connection-selector-item-${id}`}
              key={id}
              onSelect={() => {
                setOpen(false);
                setConnectionId(id);
              }}
              data-active={id === connectionId}
              asChild
            >
              <button type="button" className="group/item flex w-full flex-row items-center justify-between gap-4">
                <div className="flex flex-col items-start gap-1">
                  <div>{name}</div>
                </div>

                <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                  <CheckCircleIcon />
                </div>
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
