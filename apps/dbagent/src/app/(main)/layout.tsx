'use server';
import { getCompletedTaskPercentage } from '~/components/onboarding/actions';
import { BelowHeaderBar, HeaderBar } from '~/components/ui/header-bar';
import { SideNav } from '~/components/ui/side-nav';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const onboardingComplete = await getCompletedTaskPercentage();

  return (
    <>
      <div className="flex h-full overflow-hidden">
        <HeaderBar />
      </div>

      <BelowHeaderBar>
        <div className="mt-14 flex h-full">
          <SideNav onboardingComplete={onboardingComplete} />
          <main className="ml-64 flex-1 p-8">{children}</main>
        </div>
      </BelowHeaderBar>
    </>
  );
}
