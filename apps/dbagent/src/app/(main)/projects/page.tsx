import { ProjectsList } from '~/components/projects/project-list';
import { getProjects } from '~/lib/db/projects';

export default async function ProjectsPage() {
  const projects = await getProjects();

  return <ProjectsList projects={projects} />;
}
