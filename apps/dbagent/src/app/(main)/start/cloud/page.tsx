'use server';
import { AWSIntegration } from '~/components/aws-integration/aws-integration';
import { listConnections } from '~/lib/db/connections';

async function getConnections() {
  const connections = await listConnections();
  return connections;
}

export default async function Page() {
  const connections = await getConnections();
  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Cloud Management Integration</h1>
      <AWSIntegration connections={connections} />
    </div>
  );
}
