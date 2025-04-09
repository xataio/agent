'use server';

import { revalidatePath } from 'next/cache';
import {
  addConnection,
  deleteConnection,
  getConnection,
  listConnections,
  makeConnectionDefault,
  updateConnection
} from '~/lib/db/connections';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getTargetDbConnection } from '~/lib/targetdb/db';

function translateError(error: string) {
  if (error.includes('uq_connections_connection_string')) {
    return 'A connection with this connection string already exists.';
  }
  if (error.includes('uq_connections_name')) {
    return 'A connection with this name already exists.';
  }
  return error;
}

export async function actionGetConnection(id: string) {
  const dbAccess = await getUserSessionDBAccess();
  return getConnection(dbAccess, id);
}

export async function actionDeleteConnection(id: string) {
  const dbAccess = await getUserSessionDBAccess();
  return deleteConnection(dbAccess, id);
}

export async function actionListConnections(projectId: string) {
  const dbAccess = await getUserSessionDBAccess();
  return listConnections(dbAccess, projectId);
}

export async function actionSaveConnection({
  projectId,
  id,
  name,
  connectionString
}: {
  projectId: string;
  id: string | null;
  name: string;
  connectionString: string;
}) {
  const dbAccess = await getUserSessionDBAccess();

  try {
    const validateResult = await validateConnection(connectionString);
    if (!validateResult.success) {
      return validateResult;
    }

    if (id) {
      await updateConnection(dbAccess, { id, name, connectionString });
      return { success: true, message: 'Connection updated successfully' };
    } else {
      await addConnection(dbAccess, { projectId, name, connectionString });
      return { success: true, message: 'Connection added successfully' };
    }
  } catch (error) {
    console.error('Error saving connection:', error);
    return { success: false, message: `Failed to save connection. ${translateError((<Error>error).message)}` };
  }
}

export async function actionMakeConnectionDefault(id: string) {
  const dbAccess = await getUserSessionDBAccess();
  try {
    const result = await makeConnectionDefault(dbAccess, id);
    revalidatePath('/connections');
    return result;
  } catch (error) {
    console.error('Error making connection default:', error);
    return { success: false, message: 'Failed to make connection default' };
  }
}

export async function validateConnection(connectionString: string) {
  try {
    const client = await getTargetDbConnection(connectionString);
    try {
      const versionResult = await client.query('SELECT version()');
      const version = versionResult.rows[0].version;
      console.log('Connection validated successfully. Postgres version: ', version);
      return { success: true, message: `Connection validated successfully.` };
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error validating connection:', error);
    return { success: false, message: `Failed to validate connection. ${error}` };
  }
}
