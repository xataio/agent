'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@internal/components';
import { DbConnection } from '~/lib/db/connections';

interface DatabaseSelectorProps {
  connections: DbConnection[];
  value: DbConnection | null;
  onChange: (value: DbConnection) => void;
}

export function ConnectionSelector({ connections, value, onChange }: DatabaseSelectorProps) {
  return (
    <div className="flex items-center space-x-2 pr-2">
      <Select
        value={value?.name || ''}
        onValueChange={(name) => {
          const selectedConnection = connections.find((db) => db.name === name);
          if (selectedConnection) {
            onChange(selectedConnection);
          }
        }}
      >
        <SelectTrigger id="database-select" className="w-[180px]">
          <SelectValue>{value?.name || ''}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {connections.map((db) => (
            <SelectItem key={db.id} value={db.name}>
              {db.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
