'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, toast } from '@xata.io/components';
import { format } from 'date-fns';
import { MessageSquare, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { fetcher } from '~/components/chat/utils';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
}

async function deleteChat(id: string) {
  const response = await fetch(`/api/chat?id=${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to delete chat');
  }

  return true;
}

export default function ChatsPage() {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { project: projectId } = useParams<{ project: string }>();

  const { data: { chats = [] } = {}, isLoading } = useQuery<{ chats: Chat[] }>({
    queryKey: ['chats'],
    queryFn: () => fetcher('/api/chat')
  });

  // Handle chat deletion
  const handleDeleteChat = async (chatId: string) => {
    if (isDeleting) return;

    setIsDeleting(chatId);

    try {
      await deleteChat(chatId);
      toast.success('Chat deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (error) {
      toast.error('Failed to delete chat');
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading chats...</div>;
  }

  if (chats.length === 0) {
    return (
      <div className="container flex flex-col items-center justify-center p-8">
        <MessageSquare className="text-muted-foreground h-12 w-12" />
        <h2 className="mt-4 text-xl font-medium">No chats found</h2>
        <p className="text-muted-foreground mt-2">Start a new chat to get started</p>
        <Button className="mt-4" asChild>
          <Link href={`/projects/${projectId}/chats/new`}>New Chat</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Chats</h1>
          <p className="text-muted-foreground mt-1">View and manage your conversation history</p>
        </div>
        <Button asChild>
          <Link href={`/projects/${projectId}/chats/new`}>New Chat</Link>
        </Button>
      </div>

      <div className="w-full">
        <div className="rounded-md border">
          <div className="divide-border divide-y">
            {chats.map((chat) => (
              <div key={chat.id} className="hover:bg-muted/50 group flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-muted-foreground h-5 w-5" />
                  <div>
                    <h3 className="font-medium">{chat.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      Created on {format(new Date(chat.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projects/${projectId}/chats/${chat.id}`}>Open Chat</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteChat(chat.id)}
                    disabled={isDeleting === chat.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete chat</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
