import { getProjectConnectionList } from '~/app/(main)/projects/[project]/actions';
import { AWSIntegration } from '~/components/aws-integration/aws-integration';

export default async function Page({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;

  const connections = await getProjectConnectionList(project);

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Cloud Management Integration</h1>
      <AWSIntegration projectId={project} connections={connections} />
    </div>
  );
}
