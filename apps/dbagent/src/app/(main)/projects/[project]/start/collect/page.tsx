import { CollectInfo } from '~/components/collect/collect';
import { listConnections } from '~/lib/db/connections';

async function getConnections() {
  const connections = await listConnections();
  return connections;
}

export default async function Page() {
  const connections = await getConnections();
  return (
    <div className="container mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Collect info about your database</h1>
      <CollectInfo connections={connections} />
    </div>
  );
}
