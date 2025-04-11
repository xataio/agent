'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@internal/components';
import { CheckCircleIcon, ChevronDownIcon } from 'lucide-react';
import { ProviderModel } from '~/lib/ai/providers/types';
import { actionGetLanguageModels } from './actions';

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function ModelSelector({ value, onValueChange, className }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [modelId, setModelId] = useState(value);

  useEffect(() => {
    async function loadModels() {
      const fetchedModels = await actionGetLanguageModels();
      setModels(fetchedModels);
    }
    void loadModels();
  }, []);

  const selectedChatModel = useMemo(() => models.find((model) => model.id === modelId), [models, modelId]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn('data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-fit', className)}
      >
        <Button data-testid="model-selector" variant="outline" className="md:h-[34px] md:px-2">
          {selectedChatModel?.name || 'Select model'}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {models.map((model) => {
          const { id, name } = model;

          return (
            <DropdownMenuItem
              data-testid={`model-selector-item-${id}`}
              key={id}
              onSelect={() => {
                setOpen(false);

                startTransition(() => {
                  setModelId(id);
                  onValueChange(id);
                });
              }}
              data-active={id === modelId}
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
