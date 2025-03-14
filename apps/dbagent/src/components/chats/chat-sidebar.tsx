import { Button, cn, ScrollArea } from '@internal/components';
import { Message } from 'ai';
import { MessageSquarePlus } from 'lucide-react';
import type { Chat } from '~/lib/ai/memory';

export type ChatWithLastMessage = Chat & {
  lastMessage: Message | null;
};

interface ChatSidebarProps {
  chats: ChatWithLastMessage[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDelete: (chatId: string) => void;
}

interface ChatSidebarItemProps {
  chat: ChatWithLastMessage;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onDelete?: (chatId: string) => void;
}

function ChatSidebarItem({ chat, selectedChatId, onSelectChat, onDelete }: ChatSidebarItemProps) {
  const lastMessage = chat.lastMessage?.content;
  const createdAt = new Date(chat.lastMessage?.createdAt || chat.createdAt).toLocaleString();

  return (
    <div className="group relative mb-2">
      <button
        onClick={() => onSelectChat(chat.id)}
        className={cn(
          'hover:bg-accent w-full rounded-lg px-4 py-2 text-left transition-colors',
          selectedChatId === chat.id && 'bg-accent'
        )}
      >
        <h3 className="w-50 truncate font-medium">{chat.title}</h3>
        {lastMessage && (
          <div className="h-10 overflow-hidden">
            <p className="text-muted-foreground text-sm">{lastMessage}</p>
          </div>
        )}
        <p className="text-muted-foreground mt-1 text-xs">{createdAt}</p>
      </button>

      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 opacity-0 transition-opacity hover:bg-red-500 hover:text-white group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat.id);
          }}
        >
          ×
        </Button>
      )}
    </div>
  );
}

export function ChatSidebar({ chats, selectedChatId, onSelectChat, onNewChat, onDelete }: ChatSidebarProps) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-80 flex-col border-l pb-12">
      <div className="flex flex-1 flex-col space-y-4 py-4">
        <div className="w-full overflow-hidden px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">Chat History</h2>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {chats.map((chat) => (
              <ChatSidebarItem
                key={chat.id}
                chat={chat}
                selectedChatId={selectedChatId}
                onSelectChat={onSelectChat}
                onDelete={chats.length > 1 ? onDelete : undefined}
              />
            ))}
          </ScrollArea>
        </div>
      </div>
      <div className="mt-auto px-3 py-2">
        <Button onClick={onNewChat} className="w-full justify-start gap-2">
          <MessageSquarePlus size={16} />
          New Chat
        </Button>
      </div>
    </div>
  );
}
