'use client';

import { DarkTheme20Filled } from '@fluentui/react-icons';
import {
  Avatar,
  AvatarImage,
  AvatarInitials,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useIsMobile
} from '@internal/components';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { PropsWithChildren } from 'react';

export type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1">
      <Image src="/images/logos/xata-agent-logo.svg" alt="xata agent" width={32} height={32} />
      <h1 className="pt-1 text-xl font-bold">xata</h1>
    </Link>
  );
}

export const HeaderBar = ({ children }: PropsWithChildren<{ user?: User }>) => {
  const { data: session } = useSession();

  return (
    <header className="bg-background fixed left-0 right-0 top-0 z-50 border-b">
      <div className="flex h-14 items-center gap-4 px-4">
        <nav aria-labelledby="mainmenulabel">
          <span className="sr-only" id="mainmenulabel">
            Main Menu
          </span>
          <div className="bg-contrastEmpty flex h-[52px] w-full items-center justify-between p-0" id="main-navbar">
            <div className="flex flex-grow items-center justify-start gap-2">
              <Logo />
              {children}
            </div>
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <UserAvatar user={session?.user} />
        </div>
      </div>
    </header>
  );
};

export const BelowHeaderBar = ({ children }: PropsWithChildren) => {
  return <div className="mt-[53px] h-[calc(100vh-53px)]">{children}</div>;
};

function UserAvatar({ user }: { user?: User }) {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={user?.image ?? ''} alt={user?.name ?? 'User'} />
          <AvatarInitials className="rounded-lg">{user?.name}</AvatarInitials>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="-mr-8 mt-12 w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side={isMobile ? 'bottom' : 'right'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user?.image ?? ''} alt={user?.name ?? 'User'} />
              <AvatarInitials className="rounded-lg">{user?.name}</AvatarInitials>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user?.name}</span>
              <span className="truncate text-xs">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <DropdownMenuItem>
            <DarkTheme20Filled />
            {theme === 'dark' ? 'Light' : 'Dark'} theme
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
