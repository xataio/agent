import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { sqlArtifact } from './client'; // Adjust path as necessary
import { ArtifactContent } from '../create-artifact'; // Adjust path

// Mock toast
const mockToast = {
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock('@xata.io/components', () => ({
  ...jest.requireActual('@xata.io/components'), // Import and retain default exports
  toast: mockToast, // Mock the toast export
}));

// Mock dependencies and props
const mockSetMetadata = jest.fn();
const mockOnSaveContent = jest.fn();
const mockGetDocumentContentById = jest.fn();

const defaultProps: React.ComponentProps<typeof sqlArtifact.content> = {
  title: 'Test SQL Query',
  content: 'SELECT * FROM users;',
  mode: 'edit',
  isCurrentVersion: true,
  currentVersionIndex: 0,
  status: 'idle',
  suggestions: [],
  onSaveContent: mockOnSaveContent,
  isInline: false,
  getDocumentContentById: mockGetDocumentContentById,
  isLoading: false,
  metadata: {},
  setMetadata: mockSetMetadata,
};

describe('SqlArtifact Content', () => {
  it('should render the SQL query content', () => {
    render(React.createElement(sqlArtifact.content, defaultProps));
    
    // Check if the SQL query is displayed
    const queryElement = screen.getByText((content, element) => {
      // Allow matching part of the text content if it's inside a <pre> or similar
      const hasText = (node: Element | null) => node?.textContent === defaultProps.content;
      const elementHasText = hasText(element);
      const childrenDontHaveText = Array.from(element?.children || []).every(
        (child) => !hasText(child)
      );
      return elementHasText && childrenDontHaveText;
    });
    expect(queryElement).toBeInTheDocument();
    
    // Check if it's in a <pre> tag for formatting
    expect(queryElement.tagName).toBe('PRE');
  });

  // More tests will be added here for "Run Query" and "View Results"

  describe('Run Query Action', () => {
    // Mock fetch globally for these tests
    global.fetch = jest.fn();


    beforeEach(() => {
      // Reset mocks before each test
      (global.fetch as jest.Mock).mockClear();
      mockToast.info.mockClear();
      mockToast.success.mockClear();
      mockToast.error.mockClear();
      mockSetMetadata.mockClear(); // Assuming mockSetMetadata is available from outer scope
    });

    const runQueryAction = sqlArtifact.actions.find(a => a.description === 'Run Query');

    if (!runQueryAction) {
      throw new Error('Run Query action not found in sqlArtifact.actions');
    }

    it('should call /api/sql with the query and show success toast on successful execution', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ id: 1, name: 'Test' }] }),
      });

      const actionContext = {
        content: 'SELECT * FROM test_table;',
        handleVersionChange: jest.fn(),
        currentVersionIndex: 0,
        isCurrentVersion: true,
        mode: 'edit' as 'edit' | 'diff',
        metadata: {},
        setMetadata: mockSetMetadata,
      };

      await runQueryAction.onClick(actionContext);

      expect(global.fetch).toHaveBeenCalledWith('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: actionContext.content }),
      });
      expect(mockToast.info).toHaveBeenCalledWith('Running query...');
      expect(mockToast.success).toHaveBeenCalledWith('Query executed successfully!');
      expect(mockSetMetadata).toHaveBeenNthCalledWith(1, expect.objectContaining({ isRunningQuery: true, error: null }));
      expect(mockSetMetadata).toHaveBeenNthCalledWith(2, expect.objectContaining({ results: [{ id: 1, name: 'Test' }], error: null, isRunningQuery: false }));
    });

    it('should show error toast if query is empty', async () => {
      const actionContext = {
        content: ' ', // Empty query
        handleVersionChange: jest.fn(),
        currentVersionIndex: 0,
        isCurrentVersion: true,
        mode: 'edit' as 'edit' | 'diff',
        metadata: {},
        setMetadata: mockSetMetadata,
      };

      await runQueryAction.onClick(actionContext);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('Query is empty.');
      expect(mockSetMetadata).not.toHaveBeenCalled();
    });

    it('should show error toast on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });
      
      const actionContext = {
        content: 'SELECT * FROM error_table;',
        handleVersionChange: jest.fn(),
        currentVersionIndex: 0,
        isCurrentVersion: true,
        mode: 'edit' as 'edit' | 'diff',
        metadata: {},
        setMetadata: mockSetMetadata,
      };

      await runQueryAction.onClick(actionContext);

      expect(global.fetch).toHaveBeenCalledWith('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: actionContext.content }),
      });
      expect(mockToast.info).toHaveBeenCalledWith('Running query...');
      expect(mockToast.error).toHaveBeenCalledWith('Failed to run query: Internal Server Error');
      expect(mockSetMetadata).toHaveBeenNthCalledWith(1, expect.objectContaining({ isRunningQuery: true, error: null }));
      expect(mockSetMetadata).toHaveBeenNthCalledWith(2, expect.objectContaining({ results: null, error: 'Internal Server Error', isRunningQuery: false }));
    });
     it('should show error toast on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

      const actionContext = {
        content: 'SELECT * FROM network_failure;',
        handleVersionChange: jest.fn(),
        currentVersionIndex: 0,
        isCurrentVersion: true,
        mode: 'edit' as 'edit' | 'diff',
        metadata: {},
        setMetadata: mockSetMetadata,
      };

      await runQueryAction.onClick(actionContext);
      
      expect(mockToast.info).toHaveBeenCalledWith('Running query...');
      expect(mockToast.error).toHaveBeenCalledWith('Failed to run query: Network failed');
      expect(mockSetMetadata).toHaveBeenNthCalledWith(1, expect.objectContaining({ isRunningQuery: true, error: null }));
      expect(mockSetMetadata).toHaveBeenNthCalledWith(2, expect.objectContaining({ results: null, error: 'Network failed', isRunningQuery: false }));
    });
  });

  describe('View Results Action', () => {
    const viewResultsAction = sqlArtifact.actions.find(a => a.description === 'View Results');

    if (!viewResultsAction) {
      throw new Error('View Results action not found in sqlArtifact.actions');
    }

    // Spy on window.alert and toast
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    // mockToast is already defined in the outer scope and is the one used by the component due to jest.mock at the top

    beforeEach(() => {
      alertSpy.mockClear();
      mockToast.info.mockClear();
      mockToast.success.mockClear();
      mockToast.error.mockClear();
      mockSetMetadata.mockClear(); 
    });

    afterAll(() => {
      alertSpy.mockRestore();
    });

    it('should be disabled if query is running', () => {
      const actionContext = {
        metadata: { isRunningQuery: true },
        // other context properties are not relevant for isDisabled here
      } as any; // Cast to any to simplify context for isDisabled
      expect(viewResultsAction.isDisabled?.(actionContext)).toBe(true);
    });

    it('should be enabled if query is not running', () => {
      const actionContext = {
        metadata: { isRunningQuery: false },
      } as any;
      expect(viewResultsAction.isDisabled?.(actionContext)).toBe(false);
    });
    
    it('should show info toast if query is running when onClick is called', () => {
      const actionContext = {
        metadata: { isRunningQuery: true },
      } as any;
      viewResultsAction.onClick(actionContext);
      expect(mockToast.info).toHaveBeenCalledWith('Query is currently running.');
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('should show results via alert and toast if results are present', () => {
      const mockResults = [{ id: 1, data: 'some data' }];
      const actionContext = {
        metadata: { results: mockResults, isRunningQuery: false },
      } as any;
      viewResultsAction.onClick(actionContext);
      expect(mockToast.success).toHaveBeenCalledWith('Displaying results (see alert/console).');
      expect(alertSpy).toHaveBeenCalledWith(`Results:\n${JSON.stringify(mockResults, null, 2)}`);
    });

    it('should show error toast if error is present in metadata', () => {
      const mockError = 'Failed query';
      const actionContext = {
        metadata: { error: mockError, isRunningQuery: false },
      } as any;
      viewResultsAction.onClick(actionContext);
      expect(mockToast.error).toHaveBeenCalledWith(`Error from previous query run: ${mockError}`);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('should show info toast if no results or error are present', () => {
      const actionContext = {
        metadata: { isRunningQuery: false }, // No results, no error
      } as any;
      viewResultsAction.onClick(actionContext);
      expect(mockToast.info).toHaveBeenCalledWith('No results to display. Run a query first.');
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });
});

// Basic test for the artifact definition itself
describe('SqlArtifact Definition', () => {
  it('should have the correct kind and description', () => {
    expect(sqlArtifact.kind).toBe('sql');
    expect(sqlArtifact.description).toBe('Useful for SQL queries, allowing execution and viewing results.');
  });

  it('should have actions defined', () => {
    expect(sqlArtifact.actions).toBeInstanceOf(Array);
    expect(sqlArtifact.actions.length).toBeGreaterThan(0);
    // Check for specific actions by description
    expect(sqlArtifact.actions.find(action => action.description === 'Run Query')).toBeDefined();
    expect(sqlArtifact.actions.find(action => action.description === 'View Results')).toBeDefined();
  });
});
