import { SlackIntegration } from '~/components/slack-integration/slack-integration';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project } = await params;

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Collect info about your database</h1>
      <SlackIntegration projectId={project} />
    </div>
  );
}
