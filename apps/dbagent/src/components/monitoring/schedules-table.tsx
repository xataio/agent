'use client';

import { Button, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@internal/components';
import { PencilIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DbConnection } from '~/lib/db/connections';
import { actionGetSchedules, actionUpdateScheduleEnabled, Schedule } from './actions';

export function MonitoringScheduleTable({ connections }: { connections: DbConnection[] }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const schedules = await actionGetSchedules();
        setSchedules(schedules);
      } finally {
        setIsLoading(false);
      }
    };
    void loadSchedules();
  }, []);

  const handleToggleEnabled = async (scheduleId: string, enabled: boolean) => {
    await actionUpdateScheduleEnabled(scheduleId, enabled);
    // Refresh the schedules list
    const updatedSchedules = await actionGetSchedules();
    setSchedules(updatedSchedules);
  };

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-28 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-6 w-10 animate-pulse rounded" />
      </TableCell>
      <TableCell>
        <div className="bg-muted h-8 w-8 animate-pulse rounded" />
      </TableCell>
    </TableRow>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monitoring Schedules</h1>
        <div className="mb-6 flex items-center justify-between">
          <Link href="/monitoring/schedule/add">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" /> Add New Schedule
            </Button>
          </Link>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Playbook</TableHead>
            <TableHead className="w-[150px]">Database</TableHead>
            <TableHead className="w-[150px]">Schedule</TableHead>
            <TableHead className="w-[150px]">Last Run</TableHead>
            <TableHead className="w-[100px]">Failures</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : schedules.length === 0 ? (
            <>
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  Monitoring schedules make the agent execute a playbook periodically in order to proactively identify
                  issues.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Link href="/monitoring/schedule/add">
                    <Button>Add Schedule</Button>
                  </Link>
                </TableCell>
              </TableRow>
            </>
          ) : (
            schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{connections.find((c) => c.id === Number(schedule.connectionId))?.name}</TableCell>
                <TableCell>{schedule.playbook}</TableCell>
                <TableCell className="font-medium">
                  {schedule.scheduleType === 'cron' ? schedule.cronExpression : 'Automatic'}
                </TableCell>
                <TableCell>{schedule.lastRun}</TableCell>
                <TableCell>{schedule.failures}</TableCell>
                <TableCell>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(checked) => handleToggleEnabled(schedule.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/monitoring/schedule/${schedule.id}`}>
                      <Button variant="outline" size="icon" className="cursor-pointer">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
