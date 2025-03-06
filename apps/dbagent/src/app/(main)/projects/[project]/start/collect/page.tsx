import { CollectInfo } from '~/components/collect/collect';
import { listConnections } from '~/lib/db/connections';

async function getConnections({ params }: { params: { project: string } }) {
  const connections = await listConnections(params.project);
  return connections;
}

export default async function Page({ params }: { params: { project: string } }) {
  const connections = await getConnections({ params });
  return (
    <div className="container mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Collect info about your database</h1>
      <CollectInfo connections={connections} />
    </div>
  );
}
