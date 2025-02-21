'use client';

import { Button, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@internal/components';
import { PencilIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DbConnection } from '~/lib/db/connections';
import { actionGetSchedules, Schedule } from './actions';

export function MonitoringScheduleTable({ connections }: { connections: DbConnection[] }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  useEffect(() => {
    const loadSchedules = async () => {
      const schedules = await actionGetSchedules();
      setSchedules(schedules);
    };
    void loadSchedules();
  }, []);

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
          {schedules.length === 0 ? (
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
                  <Switch checked={schedule.enabled} />
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
