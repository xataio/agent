import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@internal/components';
import * as React from 'react';

import { Connection } from '~/lib/db/schema';

export function ConnectionSelector({
  connections,
  onSelect,
  connectionId
}: {
  connections: Connection[];
  onSelect: (connectionId: string) => void;
  connectionId?: string;
}) {
  let defaultConnection: Connection | undefined;
  if (connectionId) {
    defaultConnection = connections.find((c) => c.id === connectionId);
  } else {
    defaultConnection = connections.find((c) => c.isDefault);
  }
  const [selectedConnection, setSelectedConnection] = React.useState<Connection | undefined>(defaultConnection);

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
