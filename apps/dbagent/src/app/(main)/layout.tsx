import { BelowHeaderBar, HeaderBar } from '~/components/ui/header-bar';

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex h-full overflow-hidden">
        <HeaderBar />
      </div>

      <BelowHeaderBar>{children}</BelowHeaderBar>
    </>
  );
}
