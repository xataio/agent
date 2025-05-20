'use client';

import { Button, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xata.io/components';
import { ListIcon, PencilIcon, PlusIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Connection, Schedule } from '~/lib/db/schema';
import { actionGetSchedules, actionUpdateScheduleEnabled } from './actions';

function displayRelativeTime(date1: Date, date2: Date): string {
  const diff = date2.getTime() - date1.getTime();
  const diffSeconds = Math.floor(diff / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }
  const diffMinutes = Math.floor(diff / (1000 * 60));
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  if (diffMinutes < 1440) {
    return `${Math.floor(diffMinutes / 60)}h`;
  }
  return `${Math.floor(diffMinutes / 1440)}d`;
}

export function MonitoringScheduleTable({ connections }: { connections: Connection[] }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { project } = useParams<{ project: string }>();

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const schedules = await actionGetSchedules();
      // Sort schedules by ID to maintain stable order
      setSchedules(schedules.sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''))));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSchedules = async () => {
    const schedules = await actionGetSchedules();
    setSchedules(schedules.sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''))));
  };

  useEffect(() => {
    void loadSchedules();
  }, []);

  const handleToggleEnabled = async (scheduleId: string, enabled: boolean) => {
    await actionUpdateScheduleEnabled(scheduleId, enabled);
    // Refresh the schedules list
    const updatedSchedules = await actionGetSchedules();
    // Sort schedules by ID to maintain stable order
    setSchedules(updatedSchedules.sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''))));
  };

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </TableCell>
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
        <div className="mb-6 flex items-center gap-2">
          <Button variant="outline" onClick={() => refreshSchedules()}>
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
          <Link href={`/projects/${project}/monitoring/schedule/add`}>
            <Button>
              <PlusIcon className="h-4 w-4" /> Add New Schedule
            </Button>
          </Link>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Database</TableHead>
            <TableHead className="w-[150px]">Model</TableHead>
            <TableHead className="w-[150px]">Playbook</TableHead>
            <TableHead className="w-[150px]">Schedule</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[150px]">Last Run</TableHead>
            <TableHead className="w-[150px]">Next Run</TableHead>
            <TableHead className="w-[100px]">Failures</TableHead>
            <TableHead className="w-[100px]">Enabled</TableHead>
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
                <TableCell colSpan={10} className="text-muted-foreground py-8 text-center">
                  Monitoring schedules make the agent execute a playbook periodically in order to proactively identify
                  issues.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  <Link href={`/projects/${project}/monitoring/schedule/add`}>
                    <Button>Add Schedule</Button>
                  </Link>
                </TableCell>
              </TableRow>
            </>
          ) : (
            schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{connections.find((c) => c.id === schedule.connectionId)?.name}</TableCell>
                <TableCell>{schedule.model.includes(':') ? schedule.model.split(':')[1] : schedule.model}</TableCell>
                <TableCell>{schedule.playbook}</TableCell>
                <TableCell className="font-medium">
                  {schedule.scheduleType === 'cron' ? schedule.cronExpression : 'Automatic'}
                </TableCell>
                <TableCell>{schedule.status}</TableCell>
                <TableCell>
                  {schedule.lastRun ? (
                    <span title={schedule.lastRun}>
                      {displayRelativeTime(new Date(Date.parse(schedule.lastRun)), new Date())} ago
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {schedule.nextRun ? (
                    <span title={schedule.nextRun}>
                      {new Date(schedule.nextRun) <= new Date()
                        ? 'now'
                        : `in ${displayRelativeTime(new Date(), new Date(schedule.nextRun))}`}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{schedule.failures}</TableCell>
                <TableCell>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(checked) => handleToggleEnabled(schedule.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/projects/${project}/monitoring/schedule/${schedule.id}`}>
                      <Button variant="outline" size="icon" title="Edit schedule" className="cursor-pointer">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/projects/${project}/monitoring/runs/${schedule.id}`}>
                      <Button variant="outline" size="icon" title="View runs" className="cursor-pointer">
                        <ListIcon className="h-4 w-4" />
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
