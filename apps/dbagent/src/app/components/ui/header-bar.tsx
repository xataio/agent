'use client';

import { Button, MakiLogoSymbol } from '@internal/components';
import Link from 'next/link';
import { PropsWithChildren } from 'react';

export type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export const HeaderBar = ({ children }: PropsWithChildren<{ user?: User }>) => {
  return (
    <header className="bg-background fixed left-0 right-0 top-0 z-50 border-b">
      <div className="flex h-14 items-center gap-4 px-4">
        <nav aria-labelledby="mainmenulabel">
          <span className="sr-only" id="mainmenulabel">
            Main Menu
          </span>
          <div className="bg-contrastEmpty flex h-[52px] w-full items-center justify-between p-0" id="main-navbar">
            <div className="flex flex-grow items-center justify-start gap-2">
              <Link href="/" className="flex items-center transition-transform duration-100 ease-out hover:scale-105">
                <MakiLogoSymbol />
                <span className="pl-2 text-lg font-bold">Maki AI DBA</span>
              </Link>

              {children}
            </div>
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="sm">
            Feedback
          </Button>
          <Button variant="ghost" size="sm">
            Docs
          </Button>
        </div>
      </div>
    </header>
  );
};

export const BelowHeaderBar = ({ children }: PropsWithChildren) => {
  return <div className="h-[calc(100vh-53px)]">{children}</div>;
};
