import { SidebarInset } from '@internal/components';
import { notFound } from 'next/navigation';
import { getCompletedTaskPercentage } from '~/components/onboarding/actions';
import { SideNav } from '~/components/ui/side-nav';
import { getProjectById } from '~/lib/db/projects';

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

  const project = await getProjectById(projectId);
  if (!project) {
    return notFound();
  }

  const onboardingComplete = await getCompletedTaskPercentage(projectId);

  return (
    <div className="flex h-full w-full">
      <SideNav projectId={projectId} onboardingComplete={onboardingComplete} />

      <SidebarInset className="w-full">
        <div className="main-content mx-auto flex w-full max-w-6xl flex-col">
          <div className="relative flex-1 px-8 pt-24">{children}</div>
        </div>
      </SidebarInset>
    </div>
  );
}
