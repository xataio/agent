import { ProjectsList } from '~/components/projects/project-list';
import { listProjects } from '~/lib/db/projects';

export default async function ProjectsPage() {
  const result = await listProjects();

  return <ProjectsList projects={result.projects ?? []} />;
}
