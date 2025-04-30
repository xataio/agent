import { Button, cn } from '@xata.io/components';
import { Check } from 'lucide-react';

interface OnboardingTaskProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  buttonText: string;
  onAction: () => void;
  children?: React.ReactNode;
}

export function OnboardingTask({ title, description, icon, isCompleted, buttonText, onAction }: OnboardingTaskProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">{icon}</div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className={cn('font-medium', isCompleted && 'text-muted-foreground line-through')}>{title}</h3>
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span className="text-success flex items-center text-sm">
                  <Check className="mr-1 h-4 w-4" />
                  Completed
                </span>
              ) : (
                <Button onClick={onAction} size="sm">
                  {buttonText}
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}
