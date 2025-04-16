'use client';

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@internal/components';
import { useQuery } from '@tanstack/react-query';
import { CheckCircleIcon, ChevronDownIcon, GlobeIcon, LockIcon } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { Visibility } from '~/lib/db/schema';
import { fetcher } from './utils';

const visibilities: Array<{
  id: Visibility;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: 'private',
    label: 'Private',
    description: 'Only you can access this chat',
    icon: <LockIcon />
  },
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone with the link can access this chat',
    icon: <GlobeIcon />
  }
];

export function VisibilitySelector({
  chatId,
  className
}: {
  chatId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);

  // State for tracking chat visibility
  const [visibility, setVisibility] = useState<Visibility>('private');

  // Fetch the chat to get its visibility
  useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const response = await fetcher(`/api/chat?id=${chatId}`);
      if (response?.visibility) {
        setVisibility(response.visibility);
      }
      return response;
    }
  });

  const selectedVisibility = useMemo(() => visibilities.find(({ id }) => id === visibility), [visibility]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn('data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-fit', className)}
      >
        <Button variant="outline" className="hidden md:flex md:h-[34px] md:px-2">
          {selectedVisibility?.icon}
          {selectedVisibility?.label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[300px]">
        {visibilities.map(({ id, label, description }) => (
          <DropdownMenuItem
            key={id}
            onSelect={() => {
              setVisibility(id);
              setOpen(false);
            }}
            className="group/item flex flex-row items-center justify-between gap-4"
            data-active={visibility === id}
          >
            <div className="flex flex-col items-start gap-1">
              {label}
              {description && <div className="text-muted-foreground text-xs">{description}</div>}
            </div>
            <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
              <CheckCircleIcon />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
