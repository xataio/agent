import { getCompletedTaskPercentage } from '~/components/onboarding/actions';
import { SideNav } from '~/components/ui/side-nav';

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
  const { project } = await params;

  const onboardingComplete = await getCompletedTaskPercentage();

  return (
    <div className="mt-14 flex h-full">
      <SideNav projectId={project} onboardingComplete={onboardingComplete} />
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
