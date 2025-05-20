import { SidebarInset } from '@xata.io/components';
import { notFound } from 'next/navigation';
import { getCompletedTaskPercentage } from '~/components/onboarding/actions';
import { Container } from '~/components/ui/container';
import { SideNav } from '~/components/ui/side-nav';
import { getProject } from './actions';

type LayoutParams = {
  project: string;
};

export default async function Layout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<LayoutParams>;
}) {
  const { project: projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    return notFound();
  }

  const onboardingComplete = await getCompletedTaskPercentage(projectId);

  return (
    <div className="flex h-full w-full">
      <SideNav project={project} onboardingComplete={onboardingComplete} />

      <SidebarInset>
        <Container>{children}</Container>
      </SidebarInset>
    </div>
  );
}
