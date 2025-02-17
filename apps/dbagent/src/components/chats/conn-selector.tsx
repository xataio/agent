import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@internal/components';
import * as React from 'react';

import { DbConnection } from '~/lib/db/connections';

export function ConnectionSelector({
  connections,
  onSelect
}: {
  connections: DbConnection[];
  onSelect: (connectionId: number) => void;
}) {
  const defaultConnection = connections.find((c) => c.is_default);
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
