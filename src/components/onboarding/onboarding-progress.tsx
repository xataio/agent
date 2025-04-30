import { Progress } from '@xata.io/components';
import { CheckCircle2 } from 'lucide-react';

interface OnboardingProgressProps {
  completedSteps: number;
  totalSteps: number;
}

export function OnboardingProgress({ completedSteps, totalSteps }: OnboardingProgressProps) {
  const percentage = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Setup Progress</h2>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-success h-5 w-5" />
          <span className="text-muted-foreground text-sm">
            {completedSteps} of {totalSteps} complete ({percentage}%)
          </span>
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
