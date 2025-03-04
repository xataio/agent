import { ConnectionForm } from '~/components/connections/connection-form';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project } = await params;

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <ConnectionForm projectId={project} />
    </div>
  );
}
