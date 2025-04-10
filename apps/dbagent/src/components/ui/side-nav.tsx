'use client';

import {
  cn,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@internal/components';
import {
  ActivityIcon,
  AlarmClock,
  CloudIcon,
  DatabaseIcon,
  Drill,
  NotebookPen,
  PanelLeft,
  Server,
  WrenchIcon,
  ZapIcon
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Project } from '~/lib/db/schema';
import { Bot } from '../icons/bot';

interface SideNavProps {
  className?: string;
  project: Project;
  onboardingComplete: number;
}

export function SideNav({ className, project, onboardingComplete }: SideNavProps) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const [onboardingCompleteState, setOnboardingComplete] = useState(onboardingComplete);

  const isActive = (path: string) => {
    return pathname === path;
  };

  useEffect(() => {
    const handleOnboardingStatus = (e: CustomEvent) => {
      // Update your onboarding complete state here
      setOnboardingComplete(e.detail.completed);
    };

    window.addEventListener('onboardingStatusChanged', handleOnboardingStatus as EventListener);

    return () => {
      window.removeEventListener('onboardingStatusChanged', handleOnboardingStatus as EventListener);
    };
  }, []);

  const basePath = `/projects/${project.id}`;

  const items = [
    {
      title: `Starter guide ${onboardingCompleteState ? `(${onboardingCompleteState}%)` : ''}`,
      url: `${basePath}/start`,
      icon: ZapIcon,
      className: 'text-sm',
      subItems: [
        {
          title: 'Connect to Database',
          url: `${basePath}/start/connect`,
          icon: DatabaseIcon,
          className: 'text-xs'
        },
        {
          title: 'Collect Database Info',
          url: `${basePath}/start/collect`,
          icon: Server,
          className: 'text-xs'
        },
        ...(project.cloudProvider === 'aws' || project.cloudProvider === 'gcp'
          ? [
              {
                title: 'Cloud connect',
                url: `${basePath}/start/cloud`,
                icon: CloudIcon,
                className: 'text-xs'
              }
            ]
          : []),
        {
          title: 'Setup notifications',
          url: `${basePath}/start/notifications`,
          icon: AlarmClock,
          className: 'text-xs'
        }
      ]
    },

    {
      title: 'Chats',
      url: `${basePath}/chats`,
      icon: Bot,
      className: 'text-sm'
    },
    {
      title: 'Playbooks',
      url: `${basePath}/playbooks`,
      icon: NotebookPen,
      className: 'text-sm'
    },
    {
      title: 'Tools',
      url: `${basePath}/tools`,
      icon: Drill,
      className: 'text-sm'
    },
    {
      title: 'MCP',
      url: `${basePath}/mcp`,
      icon: WrenchIcon,
      className: 'text-sm'
    },
    {
      title: 'Monitoring',
      url: `${basePath}/monitoring`,
      icon: ActivityIcon,
      className: 'text-sm'
    }
  ];

  return (
    <Sidebar className={cn('pt-16', className)} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>

                  {item.subItems && (
                    <SidebarMenuSub>
                      {item.subItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title} className="text-sm">
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <subItem.icon />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton asChild onClick={toggleSidebar}>
          <span>
            <PanelLeft />
            <span>Collapse menu</span>
          </span>
        </SidebarMenuButton>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
