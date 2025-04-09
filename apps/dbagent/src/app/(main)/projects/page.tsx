import { ProjectsList } from '~/components/projects/project-list';
import { getProjectsList } from './actions';

export default async function ProjectsPage() {
  const projects = await getProjectsList();

  return <ProjectsList projects={projects} />;
}
