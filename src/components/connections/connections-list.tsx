'use client';

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@xata.io/components';
import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Connection } from '~/lib/db/schema';
import { actionListConnections, actionMakeConnectionDefault } from './actions';

function maskConnectionString(connString: string): string {
  // Handle URL format for both postgresql:// and postgres:// prefixes
  const urlFormat = connString.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@.*)/i, '$1****$2');

  // Handle key-value format (password=value)
  return urlFormat.replace(/password=([^;]+)/i, 'password=****');
}

export function ConnectionsList() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const router = useRouter();
  const { project } = useParams<{ project: string }>();

  useEffect(() => {
    const loadConnections = async () => {
      const connections = await actionListConnections(project);
      if (connections.length === 0) {
        router.push(`/projects/${project}/start/connect/add`);
        return;
      }
      setConnections(connections);
    };
    void loadConnections();
  }, [router, project]);

  const handleMakeDefault = async (id: string) => {
    await actionMakeConnectionDefault(id);
    setConnections(
      connections.map((conn) => ({
        ...conn,
        isDefault: conn.id === id
      }))
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Database Connections</h1>
        <Button asChild>
          <Link href={`/projects/${project}/start/connect/add`}>Add New Connection</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Connection String</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
            <TableHead className="w-[150px]">Default</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((connection) => (
            <TableRow key={connection.id}>
              <TableCell>{connection.name}</TableCell>
              <TableCell className="font-mono text-sm">{maskConnectionString(connection.connectionString)}</TableCell>
              <TableCell>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/projects/${project}/start/connect/edit/${connection.id}`}>Edit</Link>
                </Button>
              </TableCell>
              <TableCell>
                {connection.isDefault ? (
                  <div className="flex items-center justify-center">
                    <CheckIcon className="text-success h-5 w-5" />
                  </div>
                ) : (
                  <Button
                    onClick={() => handleMakeDefault(connection.id)}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    Make Default
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
