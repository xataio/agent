import { vi } from 'vitest';
import * as connectionInfoExports from '~/lib/db/connection-info';
import * as projectsExports from '~/lib/db/projects';

export const mockGetProjectsById = () => {
  vi.spyOn(projectsExports, 'getProjectById').mockImplementation(async (db, id) => {
    return { id, name: 'project name', cloudProvider: 'aws' };
  });
};

type GetConnectionInfoFunc = typeof connectionInfoExports.getConnectionInfo;

// @ts-expect-error
const defaultMock: GetConnectionInfoFunc = async (_db, _connectionId, key) => {
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
  } else if (key === 'extensions') {
    return [{ name: 'pgvector', default_version: '1.0.1', installed_version: '1.0.0' }];
  }
  return null;
};

export const mockGetConnectionInfo = (mockImplementation: GetConnectionInfoFunc = defaultMock) => {
  vi.spyOn(connectionInfoExports, 'getConnectionInfo').mockImplementation(mockImplementation);
};
