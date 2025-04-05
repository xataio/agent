import { AWSIntegration } from '~/components/aws-integration/aws-integration';
import { GCPIntegration } from '~/components/gcp-integration/gcp-integration';
import { listConnections } from '~/lib/db/connections';
import { getProjectById } from '~/lib/db/projects';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project: projectId } = await params;
  const project = await getProjectById(projectId);
  const connections = await listConnections(projectId);

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Cloud Management Integration</h1>
      {project?.cloudProvider === 'aws' ? (
        <AWSIntegration projectId={projectId} connections={connections} />
      ) : project?.cloudProvider === 'gcp' ? (
        <GCPIntegration projectId={projectId} connections={connections} />
      ) : null}
    </div>
  );
}
