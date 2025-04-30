'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
} from '@xata.io/components';
import { useState } from 'react';
import { generateCronExpression } from './actions';

interface CronExpressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (expression: string) => void;
}

export function CronExpressionModal({ isOpen, onClose, onGenerate }: CronExpressionModalProps) {
  const [input, setInput] = useState('');
  const [generatedExpression, setGeneratedExpression] = useState('');

  const handleGenerate = async () => {
    const expression = await generateCronExpression(input);
    setGeneratedExpression(expression);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Cron Expression</DialogTitle>
          <DialogDescription>
            Enter a description of your desired schedule, and we&apos;ll generate a cron expression for you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="schedule-description" className="text-right">
              Description
            </Label>
            <div className="col-span-3">
              <Input
                id="schedule-description"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full"
                placeholder="e.g., Every Monday at 9 AM"
              />
            </div>
          </div>
          {generatedExpression && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="generated-expression" className="text-right">
                Generated
              </Label>
              <div className="col-span-3">
                <Input id="generated-expression" value={generatedExpression} readOnly />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleGenerate}>
            Generate
          </Button>
          <Button type="button" onClick={() => onGenerate(generatedExpression)} disabled={!generatedExpression}>
            Use Expression
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
