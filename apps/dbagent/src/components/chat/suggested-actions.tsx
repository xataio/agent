'use client';

import { Button } from '@xata.io/components';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { motion } from 'framer-motion';
import { memo } from 'react';

export type SuggestedAction = {
  title: string;
  action: string;
};

interface SuggestedActionsProps {
  suggestedActions?: SuggestedAction[];
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
}

function PureSuggestedActions({ suggestedActions = [], append }: SuggestedActionsProps) {
  return (
    <div data-testid="suggested-actions" className="grid w-full gap-2 sm:grid-cols-2">
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:flex' : 'flex'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              void append({
                role: 'user',
                content: suggestedAction.action
              });
            }}
            className="h-auto w-full flex-1 items-start justify-start gap-1 rounded-xl border px-4 py-3.5 text-left text-sm sm:flex-col"
          >
            <p className="text-wrap font-medium">{suggestedAction.title}</p>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
