import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type DbConnection = {
  id: number;
  name: string;
  connstring: string;
  is_default: boolean;
};

export async function listConnections(): Promise<DbConnection[]> {
  try {
    const connections = await prisma.connections.findMany({
      select: {
        id: true,
        name: true,
        connstring: true,
        is_default: true
      }
    });
    return connections;
  } catch (error) {
    console.error('Error listing connections:', error);
    throw error;
  }
}

export async function getDefaultConnection(): Promise<DbConnection | null> {
  try {
    const connection = await prisma.connections.findFirst({
      where: { is_default: true },
      select: {
        id: true,
        name: true,
        connstring: true
      }
    });
    return connection || null;
  } catch (error) {
    console.error('Error fetching connection:', error);
    return null;
  }
}

export async function getConnection(id: number): Promise<DbConnection | null> {
  try {
    const connection = await prisma.connections.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        connstring: true,
        is_default: true
      }
    });
    return connection || null;
  } catch (error) {
    console.error('Error fetching connection:', error);
    return null;
  }
}

export async function makeConnectionDefault(id: number) {
  try {
    await prisma.$transaction(async (prisma) => {
      await prisma.connections.updateMany({
        where: { is_default: true },
        data: { is_default: false }
      });
      await prisma.connections.update({
        where: { id },
        data: { is_default: true }
      });
    });
  } catch (error) {
    console.error('Error making connection default:', error);
    throw error;
  }
}

export async function deleteConnection(id: number) {
  try {
    await prisma.$transaction(async (prisma) => {
      const wasDefault = await prisma.connections.findUnique({
        where: { id },
        select: { is_default: true }
      });

      await prisma.assoc_instance_connections.deleteMany({
        where: { connection_id: id }
      });
      await prisma.dbinfo.deleteMany({
        where: { connid: id }
      });
      await prisma.connections.delete({
        where: { id }
      });

      if (wasDefault?.is_default) {
        const nextConnection = await prisma.connections.findFirst({
          select: { id: true }
        });
        if (nextConnection) {
          await prisma.connections.update({
            where: { id: nextConnection.id },
            data: { is_default: true }
          });
        }
      }
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    throw error;
  }
}

export async function addConnection({ name, connstring }: { name: string; connstring: string }): Promise<DbConnection> {
  try {
    const count = await prisma.connections.count();
    const isFirst = count === 0;

    const connection = await prisma.connections.create({
      data: {
        name,
        connstring,
        is_default: isFirst
      },
      select: {
        id: true,
        name: true,
        connstring: true,
        is_default: true
      }
    });

    return connection;
  } catch (error) {
    console.error('Error adding connection:', error);
    throw error;
  }
}

export async function updateConnection({
  id,
  name,
  connstring
}: {
  id: number;
  name: string;
  connstring: string;
}): Promise<DbConnection> {
  try {
    const connection = await prisma.connections.update({
      where: { id },
      data: {
        name,
        connstring
      },
      select: {
        id: true,
        name: true,
        connstring: true,
        is_default: true
      }
    });

    return connection;
  } catch (error) {
    console.error('Error updating connection:', error);
    throw error;
  }
}
