import { validateConnection } from '~/components/connections/actions';
import { CreateProject } from '~/components/projects/create-project';

type PageParams = {
  provider: string;
};

export default async function ProjectsPage({ params }: { params: Promise<PageParams> }) {
  const { provider } = await params;

  return <CreateProject provider={provider} validateConnection={validateConnection} />;
}
