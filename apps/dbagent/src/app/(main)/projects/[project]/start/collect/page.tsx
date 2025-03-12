import { CollectInfo } from '~/components/collect/collect';
import { listConnections } from '~/lib/db/connections';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project } = await params;
  const connections = await listConnections(project);

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Collect info about your database</h1>
      <CollectInfo connections={connections} />
    </div>
  );
}
