'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast
} from '@xata.io/components';
import { useEffect, useState } from 'react';
import { Connection } from '~/lib/db/schema';
import { PerformanceSetting } from '~/lib/targetdb/db';
import { collectVacuumData } from './actions';
import { Skeleton } from './skeleton';

export function VacuumSettingsCard({
  selectedConnection,
  initialData
}: {
  selectedConnection: Connection | undefined;
  initialData: PerformanceSetting[] | undefined;
}) {
  const [vacuumSettings, setVacuumSettings] = useState<PerformanceSetting[]>(initialData || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialData) {
      setVacuumSettings(initialData);
      setLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await collectVacuumData(selectedConnection);
        if (result.success) {
          setVacuumSettings(result.data);
        } else {
          toast(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error fetching vacuum settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!initialData) {
      void fetchData();
    }
  }, [initialData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VACUUM Settings and State</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-5/6" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vacuumSettings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>VACUUM Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          VACUUM is a critical maintenance operation in PostgreSQL that reclaims storage occupied by dead tuples. These
          settings control when and how autovacuum runs, which is essential for maintaining database performance and
          preventing transaction ID wraparound.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacuumSettings.map((setting) => (
              <TableRow key={setting.name}>
                <TableCell>{setting.name}</TableCell>
                <TableCell>{setting.setting}</TableCell>
                <TableCell>{setting.unit}</TableCell>
                <TableCell>{setting.source}</TableCell>
                <TableCell>{setting.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
