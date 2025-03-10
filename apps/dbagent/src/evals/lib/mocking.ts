import { vi } from 'vitest';
import * as connectionInfoExports from '~/lib/db/connection-info';
import * as projectsExports from '~/lib/db/projects';

export const mockGetProjectsById = () => {
  vi.spyOn(projectsExports, 'getProjectById').mockImplementation(async (id) => {
    return { success: true, project: { id, ownerId: 'ownerId', name: 'project name' } };
  });
};

export const mockGetConnectionInfo = () => {
  vi.spyOn(connectionInfoExports, 'getConnectionInfo').mockImplementation(async (connectionId, key) => {
    if (key === 'tables') {
      return [
        {
          name: 'dogs',
          schema: 'public',
          rows: 150,
          size: '24 kB',
          seqScans: 45,
          idxScans: 120,
          nTupIns: 200,
          nTupUpd: 50,
          nTupDel: 10
        }
      ];
    }
    return null;
  });
};
