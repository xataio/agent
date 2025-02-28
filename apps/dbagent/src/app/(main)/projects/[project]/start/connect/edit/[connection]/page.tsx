import { ConnectionForm } from '~/components/connections/connection-form';

type PageParams = {
  project: string;
  connection: string;
};

export default async function EditConnection({ params }: { params: Promise<PageParams> }) {
  const { project, connection } = await params;

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Edit Connection</h1>
      <ConnectionForm projectId={project} id={connection} />
    </div>
  );
}
