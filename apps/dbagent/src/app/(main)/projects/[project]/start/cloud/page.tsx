'use server';
import { AWSIntegration } from '~/components/aws-integration/aws-integration';
import { listConnections } from '~/lib/db/connections';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const connections = await listConnections();
  const { project } = await params;

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Cloud Management Integration</h1>
      <AWSIntegration projectId={project} connections={connections} />
    </div>
  );
}
