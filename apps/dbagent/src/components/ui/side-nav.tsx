'use client';

import { cn } from '@internal/components';
import {
  ActivityIcon,
  AlarmClock,
  BotMessageSquare,
  CloudIcon,
  DatabaseIcon,
  NotebookPen,
  Server,
  ZapIcon
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SideNavProps {
  className?: string;
  projectId: string;
  onboardingComplete: number;
}

export function SideNav({ className, projectId, onboardingComplete }: SideNavProps) {
  const pathname = usePathname();
  const [onboardingCompleteState, setOnboardingComplete] = useState(onboardingComplete);

  const isActive = (path: string) => {
    return pathname === path ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent';
  };

  useEffect(() => {
    const handleOnboardingStatus = (e: CustomEvent) => {
      // Update your onboarding complete state here
      setOnboardingComplete(e.detail.completed);
    };

    window.addEventListener('onboardingStatusChanged', handleOnboardingStatus as EventListener);

    return () => {
      window.removeEventListener('onboardingStatusChanged', handleOnboardingStatus as EventListener);
    };
  }, []);

  const basePath = `/projects/${projectId}`;

  return (
    <div className={cn('bg-background fixed h-lvh w-64 border-r', className)}>
      <div className="space-y-4 p-4">
        <nav className="space-y-2">
          <Link
            href={`${basePath}/start`}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm', isActive(`/start`))}
          >
            <ZapIcon className="h-4 w-4" />
            Starter guide {onboardingCompleteState ? `(${onboardingCompleteState}%)` : ''}
          </Link>
        </nav>
        <nav className="space-y-2">
          <Link
            href={`${basePath}/start/connect`}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-xs', isActive(`/start/connect`))}
          >
            <DatabaseIcon className="h-4 w-4 pl-2" />
            Connect to Database
          </Link>
        </nav>
        <nav className="space-y-2">
          <Link
            href={`${basePath}/start/collect`}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-xs', isActive(`/start/collect`))}
          >
            <Server className="h-4 w-4 pl-2" />
            Collect Database Info
          </Link>
        </nav>
        <nav className="space-y-2">
          <Link
            href={`${basePath}/start/cloud`}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-xs', isActive(`/start/cloud`))}
          >
            <CloudIcon className="h-4 w-4 pl-2" />
            Connect cloud management
          </Link>
        </nav>

        <nav className="space-y-2">
          <Link
            href={`${basePath}/start/notifications`}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-xs', isActive(`/start/environments`))}
          >
            <AlarmClock className="h-4 w-4 pl-2" />
            Setup notifications
          </Link>
        </nav>

        <nav className="space-y-2">
          <Link
            href={`${basePath}/chats`}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm', isActive(`/chats`))}
          >
            <BotMessageSquare className="h-4 w-4" />
            Chats
          </Link>
        </nav>

        <nav className="space-y-2">
          <Link
            href={`${basePath}/playbooks`}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm', isActive(`/integrations`))}
          >
            <NotebookPen className="h-4 w-4" />
            Playbooks
          </Link>
        </nav>

        <nav className="space-y-2">
          <Link
            href={`${basePath}/monitoring`}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm', isActive(`/monitoring`))}
          >
            <ActivityIcon className="h-4 w-4" />
            Monitoring
          </Link>
        </nav>
      </div>
    </div>
  );
}
