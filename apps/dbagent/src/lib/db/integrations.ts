import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type AwsIntegration = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

type IntegrationModules = {
  aws: AwsIntegration;
};

export async function saveIntegration<T extends keyof IntegrationModules>(name: T, data: IntegrationModules[T]) {
  await prisma.integrations.upsert({
    where: { name },
    update: { data },
    create: { name, data }
  });
}

export async function getIntegration<T extends keyof IntegrationModules>(
  name: string
): Promise<IntegrationModules[T] | null> {
  const result = await prisma.integrations.findUnique({
    where: { name },
    select: { data: true }
  });
  return result?.data || null;
}
