'use server';

export type Schedule = {
  id: string;
  schedule: string;
  playbook: string;
  lastRun: string;
  failures: number;
  enabled: boolean;
};

export async function getSchedules(): Promise<Schedule[]> {
  // TODO: Replace with actual database query
  return [
    {
      id: '1',
      schedule: 'Every hour',
      playbook: 'Check API Status',
      lastRun: '2023-05-01 14:30',
      failures: 0,
      enabled: true
    },
    {
      id: '2',
      schedule: 'Daily at 00:00',
      playbook: 'Database Backup',
      lastRun: '2023-05-01 00:00',
      failures: 1,
      enabled: true
    },
    {
      id: '3',
      schedule: 'Weekly on Sunday',
      playbook: 'Generate Reports',
      lastRun: '2023-04-30 01:00',
      failures: 0,
      enabled: false
    },
    {
      id: '4',
      schedule: 'Every 15 minutes',
      playbook: 'Monitor Server Load',
      lastRun: '2023-05-01 14:45',
      failures: 2,
      enabled: true
    }
  ];
}
