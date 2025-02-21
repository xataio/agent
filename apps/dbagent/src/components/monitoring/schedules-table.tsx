'use client';

import { Button, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@internal/components';
import { PencilIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DbConnection } from '~/lib/db/connections';
import { actionGetSchedules, Schedule } from './actions';
import { ConnectionSelector } from './conn-selector';

export function MonitoringScheduleTable({ connections }: { connections: DbConnection[] }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const defaultConnection = connections.find((c) => c.is_default);
  const [selectedDatabase, setSelectedDatabase] = useState<DbConnection | null>(defaultConnection || null);
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
          <ConnectionSelector connections={connections} value={selectedDatabase} onChange={setSelectedDatabase} />
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
            <TableHead className="w-[150px]">Schedule</TableHead>
            <TableHead>Playbook</TableHead>
            <TableHead className="w-[150px]">Last Run</TableHead>
            <TableHead className="w-[100px]">Failures</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell className="font-medium">
                {schedule.scheduleType === 'cron' ? schedule.cronExpression : 'Automatic'}
              </TableCell>
              <TableCell>{schedule.playbook}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
