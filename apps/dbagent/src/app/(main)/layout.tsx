import { BelowHeaderBar, HeaderBar } from '~/app/components/ui/header-bar';
import { SideNav } from '../components/ui/side-nav';

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex h-full overflow-hidden">
        <HeaderBar />
      </div>

      <BelowHeaderBar>
        <div className="mt-14 flex h-full">
          <SideNav />
          <main className="ml-64 flex-1 p-8">{children}</main>
        </div>
      </BelowHeaderBar>
    </>
  );
}
