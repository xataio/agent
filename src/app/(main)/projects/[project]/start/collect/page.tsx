import { getProjectConnectionList } from '~/app/(main)/projects/[project]/actions';
import { CollectInfo } from '~/components/collect/collect';

export default async function Page({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;

  const connections = await getProjectConnectionList(project);

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Collect info about your database</h1>
      <CollectInfo connections={connections} />
    </div>
  );
}
