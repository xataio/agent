import { Message } from 'ai';
import {
  Chat as DbChat,
  createChat,
  deleteChat,
  getChatById,
  listChatMessages,
  listChats,
  storeMessages,
  updateChat
} from '~/lib/db/chats';

export type Chat = {
  id: string;
  projectId: string;
  connectionId?: string;
  title?: string;
  createdAt: Date;
};

export class Memory {
  readonly projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async listChats(): Promise<Chat[]> {
    const dbChats = await listChats(this.projectId);
    return dbChats.map(dbChatToChat).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async saveChat(chat: Omit<Chat, 'id' | 'projectId'>): Promise<Chat> {
    const dbChat: DbChat = await createChat({
      projectId: this.projectId,
      connectionId: chat.connectionId,
      title: chat.title,
      createdAt: chat.createdAt.toISOString()
    });

    return dbChatToChat(dbChat);
  }

  async getChatById(id: string): Promise<Chat | null> {
    const dbChat = await getChatById(id);
    return dbChat ? dbChatToChat(dbChat) : null;
  }

  getChatMemory(id: string): ChatMemory {
    return new ChatMemory(id);
  }

  async updateChat(id: string, title?: string, connectionId?: string): Promise<Chat> {
    const dbChat = await updateChat(id, title, connectionId);
    return dbChatToChat(dbChat);
  }

  async deleteChat(id: string): Promise<void> {
    await deleteChat(id);
  }
}

export class ChatMemory {
  readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async getMessages(limit?: number): Promise<Message[]> {
    const messages = await listChatMessages(this.chatId, limit);
    return messages.reverse().map((m) => {
      const message = m.message;
      return { ...message, id: m.id, createdAt: new Date(m.createdAt) };
    });
  }

  async addMessage(message: Message): Promise<Message> {
    const messages = await this.addMessages([message]);
    return messages[0]!;
  }

  async addMessages(messages: Message[]): Promise<Message[]> {
    const dbMessages = await storeMessages(
      this.chatId,
      messages.map((m) => ({
        id: m.id ? m.id : crypto.randomUUID(),
        chatId: this.chatId,
        message: m,
        createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString()
      }))
    );
    return dbMessages.map((m) => ({
      ...m.message,
      createdAt: new Date(m.createdAt)
    }));
  }
}

function dbChatToChat(dbChat: DbChat): Chat {
  return {
    id: dbChat.id,
    projectId: dbChat.projectId,
    connectionId: dbChat.connectionId || undefined,
    title: dbChat.title || undefined,
    createdAt: new Date(dbChat.createdAt)
  };
}
