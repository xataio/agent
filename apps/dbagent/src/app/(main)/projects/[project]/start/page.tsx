import { notFound } from 'next/navigation';
import { Onboarding } from '~/components/onboarding/onboarding';
import { getProjectById } from '~/lib/db/projects';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project: projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-3xl">
      <Onboarding project={project} />
    </div>
  );
}
