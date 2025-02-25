'use client';

import { Activity, Database, GitBranch, Server, TowerControlIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCompletedTasks } from './actions';
import { OnboardingProgress } from './onboarding-progress';
import { OnboardingTask } from './onboarding-task';

export function Onboarding() {
  const router = useRouter();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  useEffect(() => {
    getCompletedTasks()
      .then((tasks) => {
        setCompletedTasks(tasks);
      })
      .catch((error) => {
        console.error('Failed to load completed tasks:', error);
      });
  }, []);

  const tasks = [
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
    {
      id: 'cloud',
      title: 'Connect cloud management',
      description: `Use an integration to allow me to read your relevant instance and observability data.`,
      icon: <Activity className="text-primary h-5 w-5" />,
      navigateTo: '/start/cloud'
    },
    {
      id: 'report',
      title: 'Get an initial assessment',
      description:
        'I will get an initial assessment of your database, instance/cluster type, main settings and activity and provide you with an initial report.',
      icon: <TowerControlIcon className="text-primary h-5 w-5" />,
      buttonText: 'Get initial assessment',
      navigateTo: '/chats?start=report'
    },
    {
      id: 'notifications',
      title: 'Setup Slack notifications',
      description: 'Configure a Slack integration so I can notify you if I find any issues with your database.',
      icon: <GitBranch className="text-primary h-5 w-5" />,
      navigateTo: '/start/notifications'
    }
  ];

  const handleTaskAction = async (navigateTo: string) => {
    router.push(navigateTo);
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground mt-2">
            Hey, I&apos;m Maki, your new hire. I&apos;m a PostgreSQL specialized AI expert. In order to get the most out
            of me, I need to know a few things about your database. Complete the task below to give me access to your
            database and observability data.
          </p>
        </div>

        <OnboardingProgress completedSteps={completedTasks.length} totalSteps={tasks.length} />

        <div className="space-y-4">
          {tasks.map((task) => (
            <OnboardingTask
              key={task.id}
              title={task.title}
              description={task.description}
              icon={task.icon}
              buttonText={task.buttonText || 'Setup'}
              isCompleted={completedTasks.includes(task.id)}
              onAction={() => handleTaskAction(task.navigateTo)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
