import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Connection } from '~/lib/db/schema';
import { Chat as PureChat } from './chat'; // Renamed to PureChat to avoid conflict with HTMLChatElement
import { ConnectionSelector } from './connection-selector';

// Mock data for connections
const mockConnections: Connection[] = [
  { id: 'conn-id-1', name: 'Connection 1', projectId: 'proj-1', isDefault: true, connectionString: 'cs1' },
  { id: 'conn-id-2', name: 'Connection 2', projectId: 'proj-1', isDefault: false, connectionString: 'cs2' },
  { id: 'conn-id-3', name: 'Connection 3', projectId: 'proj-1', isDefault: false, connectionString: 'cs3' }
];

// Mock @ai-sdk/react
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn().mockReturnValue({
    messages: [],
    setMessages: jest.fn(),
    handleSubmit: jest.fn(),
    input: '',
    setInput: jest.fn(),
    append: jest.fn(),
    status: 'idle',
    stop: jest.fn(),
    reload: jest.fn()
  })
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn().mockReturnValue({ project: 'test-project' }),
  useRouter: jest.fn().mockReturnValue({ push: jest.fn() })
}));

describe('ConnectionSelector', () => {
  const mockSetConnectionId = jest.fn();

  beforeEach(() => {
    mockSetConnectionId.mockClear();
  });

  it('should display "Select a database connection" when no connectionId is provided and no default exists', () => {
    const connectionsWithoutDefault = mockConnections.map((c) => ({ ...c, isDefault: false }));
    render(
      <ConnectionSelector
        connections={connectionsWithoutDefault}
        setConnectionId={mockSetConnectionId}
        connectionId={undefined}
      />
    );
    expect(screen.getByTestId('connection-selector')).toHaveTextContent('Select a database connection');
  });

  it('should display the default connection name if no connectionId is provided but a default exists', () => {
    render(
      <ConnectionSelector
        connections={mockConnections}
        setConnectionId={mockSetConnectionId}
        connectionId={undefined}
      />
    );
    // useEffect updates the state, so we need to wait for it
    waitFor(() => {
      expect(screen.getByTestId('connection-selector')).toHaveTextContent(mockConnections[0].name);
      expect(mockSetConnectionId).toHaveBeenCalledWith(mockConnections[0].id);
    });
  });

  it('should display the selected connection name when connectionId is provided', () => {
    render(
      <ConnectionSelector
        connections={mockConnections}
        setConnectionId={mockSetConnectionId}
        connectionId={mockConnections[1].id}
      />
    );
    expect(screen.getByTestId('connection-selector')).toHaveTextContent(mockConnections[1].name);
  });

  it('should call setConnectionId with the correct id when a new connection is selected', () => {
    render(
      <ConnectionSelector
        connections={mockConnections}
        setConnectionId={mockSetConnectionId}
        connectionId={mockConnections[0].id}
      />
    );

    fireEvent.click(screen.getByTestId('connection-selector')); // Open dropdown
    fireEvent.click(screen.getByTestId(`connection-selector-item-${mockConnections[2].id}`)); // Select third connection

    expect(mockSetConnectionId).toHaveBeenCalledWith(mockConnections[2].id);
  });

  it('should not call setConnectionId on initial render if connectionId is already provided', () => {
    render(
      <ConnectionSelector
        connections={mockConnections}
        setConnectionId={mockSetConnectionId}
        connectionId={mockConnections[1].id} // Initial connection is provided
      />
    );
    // setConnectionId in useEffect should only be called if connectionId is initially undefined
    expect(mockSetConnectionId).not.toHaveBeenCalled();
  });
});

describe('PureChat Component', () => {
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const defaultChatProps = {
    id: 'chat-test-id',
    projectId: 'project-test-id',
    defaultLanguageModel: 'gpt-3.5-turbo',
    connections: mockConnections,
    initialMessages: [],
    initialInput: ''
  };

  it('should initialize with initialConnectionId if provided', () => {
    render(
      <Wrapper>
        <PureChat {...defaultChatProps} initialConnectionId={mockConnections[1].id} />
      </Wrapper>
    );
    // ChatHeader receives connectionId, which is then passed to ConnectionSelector
    // We can check if ConnectionSelector displays the correct name.
    expect(screen.getByTestId('connection-selector')).toHaveTextContent(mockConnections[1].name);
  });

  it('should initialize with default connectionId if initialConnectionId is not provided but a default exists', () => {
    render(
      <Wrapper>
        <PureChat {...defaultChatProps} initialConnectionId={null} />
      </Wrapper>
    );
    waitFor(() => {
      expect(screen.getByTestId('connection-selector')).toHaveTextContent(mockConnections[0].name);
    });
  });

  it('should initialize with empty/first connection if initialConnectionId is not provided and no default exists', () => {
    const connectionsWithoutDefault = mockConnections.map((c) => ({ ...c, isDefault: false }));
    render(
      <Wrapper>
        <PureChat {...defaultChatProps} connections={connectionsWithoutDefault} initialConnectionId={null} />
      </Wrapper>
    );
    // In this case, ConnectionSelector's useEffect will call setConnectionId with the first available connection IF
    // the current behavior of PureChat is to pass `undefined` or empty string which triggers the default selection.
    // If PureChat sets it to empty string, and no default, ConnectionSelector will show "Select..."
    // PureChat initializes connectionId with `initialConnectionId || defaultConnection?.id || ''`
    // So, if initialConnectionId is null, and no default, it becomes ''.
    // ConnectionSelector receives '', and if no default, it will show "Select a database connection".
    waitFor(() => {
      expect(screen.getByTestId('connection-selector')).toHaveTextContent('Select a database connection');
    });
  });

  it('should update its internal connectionId when ConnectionSelector changes it', () => {
    const { useChat: originalUseChat } = jest.requireActual('@ai-sdk/react');
    const mockUseChatInner = jest.fn().mockImplementation(originalUseChat);
    (jest.requireMock('@ai-sdk/react').useChat as jest.Mock).mockImplementation((options) => {
      mockUseChatInner(options); // Call the spy
      // Allow inspection of options.body.connectionId
      // console.log('useChat options.body.connectionId:', options?.body?.connectionId);
      return originalUseChat(options); // Return actual hook behavior
    });

    render(
      <Wrapper>
        <PureChat {...defaultChatProps} initialConnectionId={mockConnections[0].id} />
      </Wrapper>
    );

    // Initial check
    expect(screen.getByTestId('connection-selector')).toHaveTextContent(mockConnections[0].name);
    // Verify useChat was called with initial connectionId
    expect(jest.requireMock('@ai-sdk/react').useChat).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ connectionId: mockConnections[0].id })
      })
    );

    // Change connection via ConnectionSelector
    fireEvent.click(screen.getByTestId('connection-selector'));
    fireEvent.click(screen.getByTestId(`connection-selector-item-${mockConnections[2].id}`));

    // Check if ConnectionSelector displays the new name
    expect(screen.getByTestId('connection-selector')).toHaveTextContent(mockConnections[2].name);

    // PureChat's state should update, and thus the `connectionId` passed to `useChat` hook's body
    // should reflect this change upon the next re-render triggered by the state update.
    // The useChat hook is re-called by React when PureChat re-renders due to state change.
    // We need to check the arguments of the latest call to useChat.
    expect(jest.requireMock('@ai-sdk/react').useChat).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ connectionId: mockConnections[2].id })
      })
    );
  });
});
