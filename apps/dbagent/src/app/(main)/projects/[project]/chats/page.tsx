'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  toast
} from '@internal/components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const { project: projectId } = useParams() as { project: string };

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
      queryClient.invalidateQueries({ queryKey: ['chats'] });
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
    <div className="container p-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Chats</h1>
          <p className="text-muted-foreground mt-1">View and manage your conversation history</p>
        </div>
        <Button asChild>
          <Link href={`/projects/${projectId}/chats/new`}>New Chat</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {chats.map((chat) => (
          <Card key={chat.id} className="group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 truncate">
                <MessageSquare className="text-muted-foreground h-5 w-5" />
                <span className="truncate">{chat.title}</span>
              </CardTitle>
              <CardDescription>Created on {format(new Date(chat.createdAt), 'MMM d, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground line-clamp-2 h-10 text-sm">Chat with your database assistant</div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
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
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
