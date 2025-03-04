import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@internal/components';
import * as React from 'react';

import { DbConnection } from '~/lib/db/connections';

export function ConnectionSelector({
  connections,
  onSelect,
  connectionId
}: {
  connections: DbConnection[];
  onSelect: (connectionId: string) => void;
  connectionId?: string;
}) {
  let defaultConnection: DbConnection | undefined;
  if (connectionId) {
    defaultConnection = connections.find((c) => c.id === connectionId);
  } else {
    defaultConnection = connections.find((c) => c.isDefault);
  }
  const [selectedConnection, setSelectedConnection] = React.useState<DbConnection | undefined>(defaultConnection);

  return (
    <Select
      value={selectedConnection?.name}
      onValueChange={(value) => {
        const conn = connections.find((c) => c.name === value);
        if (conn) {
          setSelectedConnection(conn);
          onSelect(conn.id);
        }
      }}
      defaultValue={defaultConnection?.name}
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
  );
}
