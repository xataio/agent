'use client';

import { SidebarProvider, Toaster, TooltipProvider } from '@internal/components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';

export const queryClient = new QueryClient();

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [isThemeReady, setIsThemeReady] = useState(false);

  // TODO - This is a workaround for a bug where we need to access localStorage or the theme flickers when dark mode is enabled
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme) {
      setIsThemeReady(true);
    } else {
      setIsThemeReady(true); // If no theme is set, consider it ready
    }
  }, []);

  if (!isThemeReady) {
    return null;
  }

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
