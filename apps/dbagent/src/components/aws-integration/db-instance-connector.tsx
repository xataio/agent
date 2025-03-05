'use client';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from '@internal/components';
import { useState } from 'react';
import { Connection } from '~/lib/db/connections';
import { saveClusterDetails } from './actions';

interface DatabaseConnectionSelectorProps {
  clusterIdentifier: string;
  region: string;
  connections: Connection[];
}

export function DatabaseConnectionSelector({
  clusterIdentifier,
  region,
  connections
}: DatabaseConnectionSelectorProps) {
  const defaultConnection = connections.find((c) => c.isDefault);
  const [selectedConnection, setSelectedConnection] = useState<Connection | undefined>(defaultConnection);

  const handleAssociate = async () => {
    if (!selectedConnection) {
      toast('Please select a database connection.');
      return;
    }

    const result = await saveClusterDetails(clusterIdentifier, region, selectedConnection);
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
