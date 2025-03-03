'use client';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from '@internal/components';
import { useSession } from 'next-auth/react';
import { DbConnection } from '~/lib/db/connections';
import { saveProjectDetails } from './actions';

interface DatabaseConnectionSelectorProps {
  clusterIdentifier: string;
  region: string;
  connections: DbConnection[];
}

export function DatabaseConnectionSelector({
  clusterIdentifier,
  region,
  connections
}: DatabaseConnectionSelectorProps) {
  const { data: session } = useSession();

  const handleAssociate = async () => {
    if (!session?.user?.id) {
      toast('Unauthorized to save project details.');
      return;
    }

    const result = await saveProjectDetails({
      name: `rds-${clusterIdentifier}`,
      ownerId: session.user.id,
      clusterIdentifier,
      region
    });
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-lg font-semibold">Associate with Database Connection</h3>
      <div className="flex items-center space-x-4">
        <Select
          value={selectedConnection?.name}
          onValueChange={(name) => {
            const conn = connections.find((c) => c.name === name);
            setSelectedConnection(conn);
          }}
          defaultValue={connections.find((c) => c.isDefault)?.name}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a database connection" />
          </SelectTrigger>
          <SelectContent>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.name}>
                {conn.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAssociate}>Associate</Button>
      </div>
    </div>
  );
}
