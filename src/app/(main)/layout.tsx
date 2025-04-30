import { HeaderBar } from '~/components/ui/header-bar';

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex h-full overflow-hidden">
        <HeaderBar />
      </div>

      <div className="flex w-full flex-col">{children}</div>
    </>
  );
}
