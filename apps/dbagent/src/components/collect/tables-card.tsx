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
import bytes from 'bytes';
import { useEffect, useState } from 'react';
import { Connection } from '~/lib/db/schema';
import { TableStat } from '~/lib/targetdb/db';
import { collectTables } from './actions';
import { Skeleton } from './skeleton';

export function TablesCard({
  selectedConnection,
  initialData
}: {
  selectedConnection: Connection | undefined;
  initialData: TableStat[] | undefined;
}) {
  const [tables, setTables] = useState<TableStat[]>(initialData || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialData) {
      setTables(initialData);
      setLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await collectTables(selectedConnection);
        if (result.success) {
          setTables(result.data);
        } else {
          toast(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error fetching tables:', error);
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
          <CardTitle>Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-5/6" />
          <Skeleton className="mb-2 h-4 w-full" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
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
        <CardTitle>Tables</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          This section provides an overview of the database tables, including their approximate number of rows, size on
          disk, and statistics on the number of times the table has been scanned using sequential scans and index scans.
        </p>
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Schema</TableHead>
                <TableHead>Estimated Rows</TableHead>
                <TableHead>Size on disk</TableHead>
                <TableHead>Seq Scan count</TableHead>
                <TableHead>Index Scan count</TableHead>
                <TableHead>Insert count</TableHead>
                <TableHead>Update count</TableHead>
                <TableHead>Delete count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.name}>
                  <TableCell>{table.name}</TableCell>
                  <TableCell>{table.schema}</TableCell>
                  <TableCell>{table.rows === -1 ? 'N/A' : table.rows.toLocaleString()}</TableCell>
                  <TableCell>{bytes(parseInt(table.size), { unitSeparator: ' ' })}</TableCell>
                  <TableCell>{table.seqScans?.toLocaleString()}</TableCell>
                  <TableCell>{table.idxScans?.toLocaleString()}</TableCell>
                  <TableCell>{table.nTupIns?.toLocaleString()}</TableCell>
                  <TableCell>{table.nTupUpd?.toLocaleString()}</TableCell>
                  <TableCell>{table.nTupDel?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
