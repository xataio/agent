import { getCompletedTaskPercentage } from '~/components/onboarding/actions';
import { SideNav } from '~/components/ui/side-nav';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const onboardingComplete = await getCompletedTaskPercentage();

  return (
    <div className="mt-14 flex h-full">
      <SideNav onboardingComplete={onboardingComplete} />
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
