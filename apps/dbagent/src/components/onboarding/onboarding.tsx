'use client';

import { Button } from '@xata.io/components';
import confetti from 'canvas-confetti';
import { Activity, Check, Database, GitBranch, Server } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Project } from '~/lib/db/schema';
import { getCompletedTasks } from './actions';
import { OnboardingProgress } from './onboarding-progress';
import { OnboardingTask } from './onboarding-task';

export const getOnboardingTasks = (project: Project) => {
  return [
    {
      id: 'connect',
      title: 'Connect to Database',
      description: `Add at least a database connection. You'd normally configure your production database connection here. Don't worry, I won't run any destructive queries.`,
      icon: <Database className="text-primary h-5 w-5" />,
      navigateTo: '/start/connect'
    },
    {
      id: 'collect',
      title: 'Collect Database Info',
      description: `Let's check that I have proper access and that I can collect some basic information about your database.`,
      icon: <Server className="text-primary h-5 w-5" />,
      navigateTo: '/start/collect'
    },
    ...(project.cloudProvider === 'aws' || project.cloudProvider === 'gcp'
      ? [
          {
            id: 'cloud',
            title: 'Connect cloud management',
            description: `Use an integration to allow me to read your relevant instance and observability data.`,
            icon: <Activity className="text-primary h-5 w-5" />,
            navigateTo: '/start/cloud'
          }
        ]
      : []),
    {
      id: 'notifications',
      title: 'Setup Slack notifications',
      description: 'Configure a Slack integration so I can notify you if I find any issues with your database.',
      icon: <GitBranch className="text-primary h-5 w-5" />,
      navigateTo: '/start/notifications'
    }
  ];
};

export function Onboarding({ project }: { project: Project }) {
  const router = useRouter();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const onboardingTasks = getOnboardingTasks(project);

  useEffect(() => {
    getCompletedTasks(project.id)
      .then((tasks) => {
        if (tasks.length === onboardingTasks.length && completedTasks.length < onboardingTasks.length) {
          void confetti({
            particleCount: 200,
            spread: 2000,
            origin: { y: 0.3 }
          });
        }
        setCompletedTasks(tasks);
        // Dispatch a custom event when tasks are loaded
        window.dispatchEvent(
          new CustomEvent('onboardingStatusChanged', {
            detail: { completed: Math.round((tasks.length / onboardingTasks.length) * 100) }
          })
        );
      })
      .catch((error) => {
        console.error('Failed to load completed tasks:', error);
      });
  }, []);

  const handleTaskAction = async (navigateTo: string) => {
    router.push(`/projects/${project.id}/${navigateTo}`);
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground mt-2">
            Hey, I&apos;m your new hire. I&apos;m a PostgreSQL specialized AI expert. In order to get the most out of
            me, I need to know a few things about your database. Complete the task below to give me access to your
            database and observability data.
          </p>
        </div>

        <OnboardingProgress completedSteps={completedTasks.length} totalSteps={onboardingTasks.length} />

        <div className="space-y-4">
          {onboardingTasks.map((task) => (
            <OnboardingTask
              key={task.id}
              title={task.title}
              description={task.description}
              icon={task.icon}
              buttonText="Setup"
              isCompleted={completedTasks.includes(task.id)}
              onAction={() => handleTaskAction(task.navigateTo)}
            />
          ))}
        </div>
        {completedTasks.length === onboardingTasks.length && (
          <div className="mt-8 space-y-4 rounded-lg border border-green-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-medium">Congratulations! All tasks completed</h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Great job! You&apos;ve completed all the setup tasks. I&apos;m now ready to help you monitor and
                    optimize your database.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => router.push(`/projects/${project.id}/chats/new?start=report`)}>
                    Get Initial Assessment
                  </Button>
                  <Button onClick={() => router.push(`/projects/${project.id}/monitoring`)} variant="outline">
                    Setup Periodic Monitoring
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
