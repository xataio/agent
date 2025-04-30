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
import { PgExtension } from '~/lib/targetdb/db';
import { collectExtensions } from './actions';
import { Skeleton } from './skeleton';

export function ExtensionsCard({
  selectedConnection,
  initialData
}: {
  selectedConnection: Connection | undefined;
  initialData: PgExtension[] | undefined;
}) {
  const [extensions, setExtensions] = useState<PgExtension[]>(initialData || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialData) {
      setExtensions(initialData);
      setLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await collectExtensions(selectedConnection);
        if (result.success) {
          setExtensions(result.data);
        } else {
          toast(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error fetching extensions:', error);
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
          <CardTitle>Extensions</CardTitle>
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
        <CardTitle>Available and installed extensions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          This section lists the currently installed extensions and their versions. We&apos;re particularly interested
          in extensions that can be used for observability and performance monitoring.
        </p>
        <div className="max-h-[200px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Available Version</TableHead>
                <TableHead>Installed Version</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extensions.map((ext) => (
                <TableRow key={ext.name}>
                  <TableCell>{ext.name}</TableCell>
                  <TableCell className={ext.installed_version ? 'text-success' : ''}>
                    {ext.installed_version ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell>{ext.default_version}</TableCell>
                  <TableCell>{ext.installed_version}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
