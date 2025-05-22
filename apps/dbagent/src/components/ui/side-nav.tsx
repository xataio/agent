'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@xata.io/components';
import {
  ActivityIcon,
  AlarmClock,
  CloudIcon,
  DatabaseIcon,
  HistoryIcon,
  MessageSquare,
  MoreVertical,
  NotebookPen,
  PanelLeft,
  Server,
  WrenchIcon,
  ZapIcon
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Chat, Project } from '~/lib/db/schema';
import { fetcher } from '../chat/utils';
import { Bot } from '../icons/bot';

interface SideNavProps {
  className?: string;
  project: Project;
  onboardingComplete: number;
}

export function SideNav({ className, project, onboardingComplete }: SideNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { toggleSidebar } = useSidebar();

  const [onboardingCompleteState, setOnboardingComplete] = useState(onboardingComplete);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');

  const queryClient = useQueryClient();
  const { data: { chats = [] } = {} } = useQuery<{ chats: Chat[] }>({
    queryKey: ['chats'],
    queryFn: () => fetcher(`/api/chat?project=${project.id}`)
  });

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleRenameChat = async () => {
    if (selectedChat && newChatTitle.trim()) {
      try {
        queryClient.setQueryData(['chats'], (oldData: { chats: Chat[] } | undefined) => {
          if (!oldData) return { chats: [] };

          return {
            chats: oldData.chats.map((chat) => (chat.id === selectedChat.id ? { ...chat, title: newChatTitle } : chat))
          };
        });

        setIsRenameDialogOpen(false);

        const response = await fetch(`/api/chat?id=${selectedChat.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: newChatTitle })
        });

        if (!response.ok) {
          throw new Error('Failed to rename chat');
        }
      } catch (error) {
        console.error('Error renaming chat:', error);
        void queryClient.invalidateQueries({ queryKey: ['chats'] });
      }
    }
  };

  const handleDeleteChat = async () => {
    if (selectedChat) {
      try {
        queryClient.setQueryData(['chats'], (oldData: { chats: Chat[] } | undefined) => {
          if (!oldData) return { chats: [] };

          return {
            chats: oldData.chats.filter((chat) => chat.id !== selectedChat.id)
          };
        });

        setIsDeleteDialogOpen(false);

        const response = await fetch(`/api/chat?id=${selectedChat.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete chat');
        }
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
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
      title: 'Chat',
      url: `${basePath}/chats/new`,
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
    <>
      <Sidebar className={cn('pt-16', className)} collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item, itemIndex) => (
                  <SidebarMenuItem key={`sidebar-item-${itemIndex}`}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>

                    {item.subItems && (
                      <SidebarMenuSub>
                        {item.subItems.map((subItem, subIndex) => (
                          <SidebarMenuSubItem key={`sidebar-subitem-${itemIndex}-${subIndex}`} className="text-sm">
                            <SidebarMenuSubButton asChild>
                              <Link href={subItem.url}>
                                {subItem.icon ? <subItem.icon /> : null}
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

          <SidebarGroup>
            <SidebarGroupLabel>Chat History</SidebarGroupLabel>
            <SidebarGroupAction
              title="All chats"
              onClick={() => {
                router.push(`${basePath}/chats`);
              }}
            >
              <HistoryIcon /> <span className="sr-only">All chats</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={`sidebar-chat-${chat.id}`} className="group/item relative">
                    <SidebarMenuButton asChild isActive={isActive(`${basePath}/chats/${chat.id}`)}>
                      <Link href={`${basePath}/chats/${chat.id}`}>
                        <MessageSquare />
                        <span>{chat.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <div className="invisible absolute right-2 top-1/2 -translate-y-1/2 group-hover/item:visible">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedChat(chat);
                              setNewChatTitle(chat.title);
                              setIsRenameDialogOpen(true);
                            }}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedChat(chat);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleRenameChat();
            }}
          >
            <Input
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              placeholder="Enter new chat name"
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={!newChatTitle.trim()}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete this chat? This action cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteChat}>
              Delete
            </Button>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
