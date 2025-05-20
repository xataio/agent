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
import { collectPerformanceSettings } from './actions';
import { Skeleton } from './skeleton';

export function PerformanceSettingsCard({
  selectedConnection,
  initialData
}: {
  selectedConnection: Connection | undefined;
  initialData: PerformanceSetting[] | undefined;
}) {
  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSetting[]>(initialData || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialData) {
      setPerformanceSettings(initialData);
      setLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await collectPerformanceSettings(selectedConnection);
        if (result.success) {
          setPerformanceSettings(result.data);
        } else {
          toast(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error fetching performance settings:', error);
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
          <CardTitle>Performance Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-5/6" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">These are some of the PostgreSQL settings that are relevant to performance.</p>
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
            {performanceSettings.map((setting) => (
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
