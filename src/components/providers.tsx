'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider, Toaster, TooltipProvider } from '@xata.io/components';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';

export const queryClient = new QueryClient();

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <Toaster />
            <SidebarProvider>{children}</SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};
