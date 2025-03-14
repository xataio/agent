import { Button, cn, ScrollArea } from '@internal/components';
import { MessageSquarePlus } from 'lucide-react';
import type { Chat } from './mock-data';

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ chats, selectedChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  return (
    <div className="flex h-full w-80 flex-col pb-12">
      <div className="flex flex-1 flex-col space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex flex-row items-center justify-between pb-4">
            <h2 className="mb-2 px-4 text-lg font-semibold">Chat History</h2>
            <Button onClick={onNewChat} className="w-full max-w-32 justify-start gap-2" variant="secondary" size="sm">
              <MessageSquarePlus size={16} />
              New Chat
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-16rem)]">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  'hover:bg-accent mb-2 w-full rounded-lg px-4 py-2 text-left transition-colors',
                  selectedChatId === chat.id && 'bg-accent'
                )}
              >
                <h3 className="truncate font-medium">{chat.title}</h3>
                <p className="text-muted-foreground truncate text-sm">{chat.lastMessage}</p>
                <p className="text-muted-foreground mt-1 text-xs">{new Date(chat.timestamp).toLocaleDateString()}</p>
              </button>
            ))}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
