import { Chat, Connection, Message, Project } from './schema';
import { saveChat, getChatById, getMessagesByChatId, deleteChatById } from './chats';
import { DBAccess } from './db';

// Mock data
const mockProjectId = 'project-uuid-123';
const mockUserId = 'user-uuid-456';
const mockConnectionId1 = 'conn-uuid-abc';
const mockConnectionId2 = 'conn-uuid-def';

const mockProject: Project = {
  id: mockProjectId,
  name: 'Test Project',
  cloudProvider: 'aws',
};

const mockConnection1: Connection = {
  id: mockConnectionId1,
  projectId: mockProjectId,
  name: 'Test Connection 1',
  isDefault: true,
  connectionString: 'postgresql://test1',
};

const mockConnection2: Connection = {
  id: mockConnectionId2,
  projectId: mockProjectId,
  name: 'Test Connection 2',
  isDefault: false,
  connectionString: 'postgresql://test2',
};

const mockChatId = 'chat-uuid-789';

const mockChatWithoutConnection: Omit<Chat, 'createdAt' | 'connectionId'> & { connectionId?: string | null } = {
  id: mockChatId,
  projectId: mockProjectId,
  title: 'Test Chat without Connection',
  model: 'gpt-3.5-turbo',
  userId: mockUserId,
};

const mockChatWithConnection1: Chat = {
  id: mockChatId,
  projectId: mockProjectId,
  title: 'Test Chat with Connection 1',
  model: 'gpt-4',
  userId: mockUserId,
  connectionId: mockConnectionId1,
  createdAt: new Date(),
};

const mockMessages: Message[] = [
  {
    id: 'msg-uuid-001',
    projectId: mockProjectId,
    chatId: mockChatId,
    role: 'user',
    parts: [{ type: 'text', content: 'Hello' }],
    createdAt: new Date(Date.now() - 10000),
  },
  {
    id: 'msg-uuid-002',
    projectId: mockProjectId,
    chatId: mockChatId,
    role: 'assistant',
    parts: [{ type: 'text', content: 'Hi there!' }],
    createdAt: new Date(),
  },
];

// Mock DBAccess
const mockDbTransaction = jest.fn(async (callback) => callback(mockTx));
const mockInsert = jest.fn().mockReturnThis();
const mockValues = jest.fn().mockReturnThis();
const mockOnConflictDoUpdate = jest.fn().mockResolvedValue([{ id: mockChatId }]);
const mockOnConflictDoNothing = jest.fn().mockResolvedValue([]);
const mockSelect = jest.fn().mockReturnThis();
const mockFrom = jest.fn().mockReturnThis();
const mockWhere = jest.fn().mockResolvedValue([]); // Default to no results
const mockLeftJoin = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockOffset = jest.fn().mockReturnThis();
const mockDelete = jest.fn().mockReturnThis();


const mockTx = {
  insert: mockInsert,
  select: mockSelect,
  delete: mockDelete,
  // Add other transaction methods if needed by the functions under test
};

const mockDb = {
  transaction: mockDbTransaction,
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
  // Add other db client methods if needed
};

const mockDbAccess: DBAccess = {
  query: jest.fn(async (callback) => callback({ db: mockDb, user: { id: mockUserId } })),
};

describe('Chat DB Functions', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default behavior for insert().values().onConflictDoUpdate()
    mockInsert.mockReturnValue({
      values: mockValues.mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate.mockResolvedValue([{ id: mockChatId }]),
        onConflictDoNothing: mockOnConflictDoNothing.mockResolvedValue([]),
      }),
    });
    
    // Default behavior for select()
     mockSelect.mockReturnValue({
      from: mockFrom.mockReturnValue({
        where: mockWhere.mockResolvedValue([]), // Default: chat not found
        leftJoin: mockLeftJoin.mockReturnThis(),
        orderBy: mockOrderBy.mockReturnThis(),
        limit: mockLimit.mockReturnThis(),
        offset: mockOffset.mockReturnThis(),
      }),
    });
  });

  describe('saveChat', () => {
    it('should correctly save a new chat with connectionId', async () => {
      const newChatData = { ...mockChatWithConnection1 };
      mockOnConflictDoUpdate.mockResolvedValueOnce([{ id: newChatData.id }]);

      await saveChat(mockDbAccess, newChatData, []);

      expect(mockDbTransaction).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith(expect.anything()); // Drizzle's table object
      expect(mockValues).toHaveBeenCalledWith(newChatData);
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            model: newChatData.model,
            title: newChatData.title,
            connectionId: newChatData.connectionId,
          }),
        })
      );
    });

    it('should correctly save a new chat with connectionId set to null', async () => {
      const newChatData = { ...mockChatWithoutConnection, connectionId: null };
      mockOnConflictDoUpdate.mockResolvedValueOnce([{ id: newChatData.id }]);
      
      await saveChat(mockDbAccess, newChatData, []);

      expect(mockValues).toHaveBeenCalledWith(newChatData);
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            connectionId: null,
          }),
        })
      );
    });
    
    it('should correctly save a new chat without connectionId (undefined)', async () => {
      const newChatData = { ...mockChatWithoutConnection, connectionId: undefined };
      // Remove connectionId from the data to be saved if it's undefined
      const expectedSaveData = { ...newChatData };
      delete expectedSaveData.connectionId;

      mockOnConflictDoUpdate.mockResolvedValueOnce([{ id: newChatData.id }]);
      
      await saveChat(mockDbAccess, newChatData, []);

      expect(mockValues).toHaveBeenCalledWith(expectedSaveData);
       expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            // connectionId should not be in the set if it was undefined in input
          }),
        })
      );
      // Check that connectionId is NOT in the set object
      const setArgs = mockOnConflictDoUpdate.mock.calls[0][0].set;
      expect(setArgs).not.toHaveProperty('connectionId');
    });

    it('should correctly update an existing chat with a new connectionId', async () => {
      const existingChatData = { ...mockChatWithConnection1 };
      const updatedChatData = { ...existingChatData, connectionId: mockConnectionId2, title: "Updated Title" };
      mockOnConflictDoUpdate.mockResolvedValueOnce([{ id: existingChatData.id }]);

      await saveChat(mockDbAccess, updatedChatData, []);

      expect(mockValues).toHaveBeenCalledWith(updatedChatData);
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            title: updatedChatData.title,
            connectionId: mockConnectionId2,
          }),
        })
      );
    });

    it('should update an existing chat to set connectionId to null', async () => {
      const existingChatData = { ...mockChatWithConnection1 };
      const updatedChatData = { ...existingChatData, connectionId: null };
       mockOnConflictDoUpdate.mockResolvedValueOnce([{ id: existingChatData.id }]);

      await saveChat(mockDbAccess, updatedChatData, []);
      
      expect(mockValues).toHaveBeenCalledWith(updatedChatData);
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            connectionId: null,
          }),
        })
      );
    });

    it('should also save messages if provided', async () => {
      const newChatData = { ...mockChatWithConnection1 };
      mockOnConflictDoUpdate.mockResolvedValueOnce([{ id: newChatData.id }]);
      
      // Second insert for messages
      const mockMessagesInsert = jest.fn().mockReturnThis();
      const mockMessagesValues = jest.fn().mockReturnThis();
      const mockMessagesOnConflictDoNothing = jest.fn().mockResolvedValue([]);
      mockInsert.mockReturnValueOnce({ // For chat
        values: mockValues.mockReturnValue({
          onConflictDoUpdate: mockOnConflictDoUpdate,
        }),
      }).mockReturnValueOnce({ // For messages
         values: mockMessagesValues.mockReturnValue({
            onConflictDoNothing: mockMessagesOnConflictDoNothing,
         })
      });


      await saveChat(mockDbAccess, newChatData, mockMessages as any[]); // Cast as any for InsertModel type

      expect(mockDbTransaction).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledTimes(2); // Once for chat, once for messages
      expect(mockValues).toHaveBeenCalledWith(newChatData); // Chat values
      expect(mockMessagesValues).toHaveBeenCalledWith(mockMessages); // Messages values
      expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
      expect(mockMessagesOnConflictDoNothing).toHaveBeenCalledTimes(1);
    });
  });

  describe('getChatById', () => {
    it('should retrieve connectionId if it exists', async () => {
      mockWhere.mockResolvedValueOnce([mockChatWithConnection1]);

      const chat = await getChatById(mockDbAccess, { id: mockChatId });

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith(expect.anything()); // Drizzle's table object
      expect(mockWhere).toHaveBeenCalledWith(expect.anything()); // Drizzle's eq condition
      expect(chat).toEqual(mockChatWithConnection1);
      expect(chat?.connectionId).toBe(mockConnectionId1);
    });

    it('should return chat with connectionId as null if it is null in DB', async () => {
       const chatWithNullConnection = { ...mockChatWithConnection1, connectionId: null };
      mockWhere.mockResolvedValueOnce([chatWithNullConnection]);

      const chat = await getChatById(mockDbAccess, { id: mockChatId });
      
      expect(chat).toEqual(chatWithNullConnection);
      expect(chat?.connectionId).toBeNull();
    });
    
    it('should return chat without connectionId property if it is undefined/not set in DB', async () => {
      // Simulate a record where connectionId was never set (might appear as undefined or missing)
      const chatWithoutConnectionField = { ...mockChatWithoutConnection }; 
      // delete (chatWithoutConnectionField as any).connectionId; // Ensure it's not on the object
      mockWhere.mockResolvedValueOnce([chatWithoutConnectionField]);

      const chat = await getChatById(mockDbAccess, { id: mockChatId });
      
      expect(chat).toEqual(chatWithoutConnectionField);
      expect(chat).not.toHaveProperty('connectionId'); 
    });
  });

  describe('getMessagesByChatId', () => {
    it('should retrieve chat details including connectionId and messages', async () => {
      const mockResultFromDb = mockMessages.map(msg => ({
        chat: mockChatWithConnection1,
        messages: msg,
      }));
      mockWhere.mockResolvedValueOnce(mockResultFromDb);

      const result = await getMessagesByChatId(mockDbAccess, { id: mockChatId });

      expect(mockSelect).toHaveBeenCalledTimes(1);
      // expect(mockFrom).toHaveBeenCalledWith(chats); // This check is tricky due to Drizzle's internal table representation
      // expect(mockLeftJoin).toHaveBeenCalledWith(messages, eq(messages.chatId, chats.id));
      // expect(mockWhere).toHaveBeenCalledWith(eq(chats.id, mockChatId));
      // expect(mockOrderBy).toHaveBeenCalledWith(asc(messages.createdAt));
      
      expect(result.id).toBe(mockChatWithConnection1.id);
      expect(result.title).toBe(mockChatWithConnection1.title);
      expect(result.model).toBe(mockChatWithConnection1.model);
      expect(result.connectionId).toBe(mockChatWithConnection1.connectionId); // Key check
      expect(result.messages).toHaveLength(mockMessages.length);
      expect(result.messages[0].id).toBe(mockMessages[0].id);
      expect(result.messages[1].id).toBe(mockMessages[1].id);
    });

    it('should retrieve chat details with connectionId as null and messages', async () => {
      const chatWithNullConnection = { ...mockChatWithConnection1, connectionId: null };
      const mockResultFromDb = mockMessages.map(msg => ({
        chat: chatWithNullConnection,
        messages: msg,
      }));
      mockWhere.mockResolvedValueOnce(mockResultFromDb);
      
      const result = await getMessagesByChatId(mockDbAccess, { id: mockChatId });
      
      expect(result.connectionId).toBeNull();
      expect(result.messages).toHaveLength(mockMessages.length);
    });
  });
  
  // TODO: Test for foreign key constraint (onDelete: 'set null')
  // This typically requires a more integrated test setup or specific mocking of cascade behavior.
  // For now, we'll acknowledge it as a to-do.
  describe('Foreign Key Constraint for connectionId (onDelete set null)', () => {
    it.todo('should set chats.connectionId to null when the referenced connection is deleted');
  });
});
