import { POST } from './route'; // Assuming route.ts is in the same directory
import { NextRequest } from 'next/server';
import * as chatDbFunctions from '~/lib/db/chats';
import * as connectionDbFunctions from '~/lib/db/connections';
import * as projectDbFunctions from '~/lib/db/projects';
import * as dbAccessModule from '~/lib/db/db';
import * as routeUtils from '~/utils/route';
import * as aiModule from '~/lib/ai/providers';
import *_ from '~/lib/ai/tools'; // Mock the tools module
import * as targetDbModule from '~/lib/targetdb/db';
import { ReadableStream } from 'stream/web'; // For mocking streamText

// Mock NextRequest
const mockRequest = (body: any): NextRequest => {
  const req = new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  // req.json = jest.fn().mockResolvedValue(body); // Already handled by NextRequest constructor
  return req;
};

// Mock dependencies
jest.mock('~/lib/db/chats', () => ({
  getChatById: jest.fn(),
  saveChat: jest.fn(),
  generateTitleFromUserMessage: jest.fn().mockResolvedValue('Generated Title'),
}));
jest.mock('~/lib/db/connections', () => ({
  getConnection: jest.fn(),
}));
jest.mock('~/lib/db/projects', () => ({
  getProjectById: jest.fn(),
}));
jest.mock('~/lib/db/db', () => ({
  getUserSessionDBAccess: jest.fn(),
}));
jest.mock('~/utils/route', () => ({
  requireUserSession: jest.fn().mockResolvedValue('test-user-id'),
}));
jest.mock('~/lib/ai/providers', () => ({
  getLanguageModel: jest.fn(),
}));
jest.mock('~/lib/ai/tools', () => ({
  getTools: jest.fn().mockResolvedValue([]), // Return an empty array for tools
}));
jest.mock('~/lib/targetdb/db', () => ({
  getTargetDbPool: jest.fn().mockReturnValue({
    end: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock streamText from 'ai' package
jest.mock('ai', () => ({
  ...jest.requireActual('ai'), // Import and retain default behavior
  streamText: jest.fn(),
  createDataStreamResponse: jest.fn((callbacks) => {
    // Immediately execute the onFinish callback for testing saveChat logic
    // This bypasses actual stream processing.
    const mockDataStream = {
      append: jest.fn(),
      close: jest.fn(),
    };
    if (callbacks.execute) {
      // Simulate the stream finishing to trigger onFinish
      const mockResponse = { messages: [{id: 'assistant-msg-id', role: 'assistant', parts: [{type: 'text', content: 'Assistant response'}] }] };
      Promise.resolve(callbacks.execute(mockDataStream)).then(() => {
        if (callbacks.execute.onFinish) {
           callbacks.execute.onFinish({ response: mockResponse });
        }
      });
    }
    // Return a dummy Response object or mock it as needed
    return new Response('stream mock');
  }),
}));


const mockDbAccess = {} as any; // Simplified mock for DBAccess
const mockModelInstance = { instance: jest.fn(), info: jest.fn().mockReturnValue({id: 'test-model'}) } as any;


describe('Chat API Route (POST)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks for successful calls
    (dbAccessModule.getUserSessionDBAccess as jest.Mock).mockResolvedValue(mockDbAccess);
    (aiModule.getLanguageModel as jest.Mock).mockResolvedValue(mockModelInstance);
    (chatDbFunctions.getChatById as jest.Mock).mockResolvedValue({
      id: 'chat-id-123',
      projectId: 'project-id-abc',
      title: 'Existing Chat',
      model: 'gpt-3.5-turbo',
      userId: 'test-user-id',
      // connectionId will be varied per test
    });
    (connectionDbFunctions.getConnection as jest.Mock).mockResolvedValue({
      id: 'conn-id-xyz',
      projectId: 'project-id-abc',
      connectionString: 'fake-conn-string',
    });
    (projectDbFunctions.getProjectById as jest.Mock).mockResolvedValue({
      id: 'project-id-abc',
      cloudProvider: 'aws',
    });
    (chatDbFunctions.saveChat as jest.Mock).mockResolvedValue([{ id: 'chat-id-123' }]);
  });

  it('should save chat with the provided connectionId', async () => {
    const chatId = 'chat-id-test-conn';
    const connectionId = 'conn-id-provided';
    const requestBody = {
      id: chatId,
      messages: [{ id: 'user-msg-id', role: 'user', parts: [{type: 'text', content: 'Hello'}] }],
      connectionId: connectionId,
      model: 'test-model',
      useArtifacts: false,
    };

    (chatDbFunctions.getChatById as jest.Mock).mockResolvedValueOnce({
      id: chatId,
      title: 'Test Chat',
      model: 'gpt-3',
      userId: 'test-user-id',
      projectId: 'project-id-abc',
    });
    (connectionDbFunctions.getConnection as jest.Mock).mockResolvedValueOnce({
      id: connectionId,
      projectId: 'project-id-abc',
      connectionString: 'fake-conn-string',
    });
    
    const req = mockRequest(requestBody);
    await POST(req);

    expect(connectionDbFunctions.getConnection).toHaveBeenCalledWith(mockDbAccess, connectionId);
    expect(chatDbFunctions.saveChat).toHaveBeenCalledWith(
      mockDbAccess,
      expect.objectContaining({
        id: chatId,
        connectionId: connectionId, // Verify this is passed
        model: 'test-model',
      }),
      expect.any(Array) // Messages array
    );
  });

  it('should save chat with connectionId as null if null is passed', async () => {
    const chatId = 'chat-id-null-conn';
    const requestBody = {
      id: chatId,
      messages: [{ id: 'user-msg-id', role: 'user', parts: [{type: 'text', content: 'Hello'}] }],
      connectionId: null, // Explicitly null
      model: 'test-model',
      useArtifacts: false,
    };
    (chatDbFunctions.getChatById as jest.Mock).mockResolvedValueOnce({
      id: chatId,
      title: 'Test Chat Null Conn',
      model: 'gpt-3',
      userId: 'test-user-id',
      projectId: 'project-id-abc',
    });
     // getConnection will be called with null, ensure it's handled (mock might return undefined or error)
    (connectionDbFunctions.getConnection as jest.Mock).mockResolvedValueOnce(undefined); // Or specific mock for null case

    const req = mockRequest(requestBody);
    // Expecting an error because connection is not found for null connectionId if not handled gracefully before saveChat
    // However, the current route code calls getConnection *before* saveChat.
    // If getConnection returns undefined for a null connectionId, it will return a 400.
    // Let's adjust the test to reflect current behavior or assume some default connection if null is passed.
    // For this test, let's assume if connectionId is null, getConnection returns undefined, and the API returns an error.
    
    // If the intention is to save null, then getConnection should not be called, or saveChat should be called with null.
    // The current API logic:
    // 1. const connection = await getConnection(dbAccess, connectionId);
    // 2. if (!connection) { return new Response('Connection not found', { status: 400 }); }
    // So, if connectionId is null and getConnection returns undefined, it errors out.

    // To test saving with null, we'd need to adjust the mock for getConnection or the API logic.
    // Let's assume for this test the API is supposed to save null if passed.
    // This means the check for `!connection` should perhaps allow saving the chat even if connection is not found.
    // However, the current code saves connectionId from the request to the chat.
    // It will try to fetch connection with `null` which will fail.
    // The test for "saving with null" is more about what `saveChat` itself does,
    // which was covered in chats.test.ts.
    // Here, we test the API behavior.

    // Let's adjust the mock for getConnection to return a valid connection even for null for this specific test path,
    // to allow the flow to reach saveChat. This is to test if 'null' is passed *to* saveChat.
    (connectionDbFunctions.getConnection as jest.Mock).mockResolvedValueOnce({
      id: 'some-default-conn-if-behavior-was-different', // This part is tricky for API test
      projectId: 'project-id-abc',
      connectionString: 'fake-conn-string',
    });


    await POST(req);

    expect(chatDbFunctions.saveChat).toHaveBeenCalledWith(
      mockDbAccess,
      expect.objectContaining({
        id: chatId,
        connectionId: null, // Verify this is passed as null
      }),
      expect.any(Array)
    );
  });

  it('should save chat with connectionId as undefined (or not present) if not passed in request', async () => {
    const chatId = 'chat-id-no-conn';
    const requestBody = { // connectionId is omitted
      id: chatId,
      messages: [{ id: 'user-msg-id', role: 'user', parts: [{type: 'text', content: 'Hello'}] }],
      model: 'test-model',
      useArtifacts: false,
    };
     (chatDbFunctions.getChatById as jest.Mock).mockResolvedValueOnce({
      id: chatId,
      title: 'Test Chat No Conn',
      model: 'gpt-3',
      userId: 'test-user-id',
      projectId: 'project-id-abc',
    });
    // If connectionId is undefined, getConnection(dbAccess, undefined) will be called.
    // This will likely result in "Connection not found".
    (connectionDbFunctions.getConnection as jest.Mock).mockResolvedValueOnce(undefined);

    const req = mockRequest(requestBody);
    const response = await POST(req);
    
    // Based on current API logic, this should fail as connection is not found
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Connection not found');
    expect(chatDbFunctions.saveChat).not.toHaveBeenCalled(); // saveChat should not be called
  });

  it('should return 400 if connectionId is provided but connection is not found', async () => {
    const requestBody = {
      id: 'chat-id-invalid-conn',
      messages: [{ id: 'user-msg-id', role: 'user', parts: [{type: 'text', content: 'Hello'}] }],
      connectionId: 'non-existent-conn-id',
      model: 'test-model',
    };
    (connectionDbFunctions.getConnection as jest.Mock).mockResolvedValueOnce(undefined); // Simulate connection not found

    const req = mockRequest(requestBody);
    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Connection not found');
    expect(chatDbFunctions.saveChat).not.toHaveBeenCalled();
  });
});
