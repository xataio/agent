export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="main-content mx-auto flex h-full w-full max-w-6xl flex-col">
      <div className="relative flex-1 px-8 pt-24">{children}</div>
    </div>
  );
}
