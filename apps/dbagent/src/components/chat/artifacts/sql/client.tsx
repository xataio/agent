import { toast } from '@xata.io/components';
import { Artifact } from '../create-artifact';
import { DocumentSkeleton } from '../document-skeleton';

interface SqlArtifactMetadata {
  results?: any[]; // Or a more specific type for query results
  error?: string | null;
  // Potentially add a loading state for when the query is running
  isRunningQuery?: boolean;
}

export const sqlArtifact = new Artifact<'sql', SqlArtifactMetadata>({
  kind: 'sql',
  description: 'Useful for SQL queries, allowing execution and viewing results.',
  initialize: async ({ documentId, setMetadata }) => {
    // TODO: Initialization logic if needed
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    // TODO: Handle stream parts if the SQL query can be streamed
    if (streamPart.type === 'sql-delta') {
      // Or a more generic type if applicable
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + (streamPart.content as string),
          isVisible:
            draftArtifact.status === 'streaming' &&
            draftArtifact.content.length > 50 && // Adjust visibility condition as needed
            draftArtifact.content.length < 100
              ? true
              : draftArtifact.isVisible,
          status: 'streaming'
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="sql" />;
    }

    // TODO: Implement diff view if necessary
    // if (mode === 'diff') {
    //   const oldContent = getDocumentContentById(currentVersionIndex - 1);
    //   const newContent = getDocumentContentById(currentVersionIndex);
    //   return <DiffView oldContent={oldContent} newContent={newContent} />;
    // }

    return (
      <div className="p-4">
        <pre className="rounded_md whitespace-pre-wrap bg-gray-100 p-2">{content}</pre>
      </div>
    );
  },
  actions: [
    {
      icon: <span>▶️</span>, // Placeholder icon
      description: 'Run Query',
      onClick: async ({ content, metadata, setMetadata }) => {
        if (!content.trim()) {
          toast.error('Query is empty.');
          return;
        }
        setMetadata((prev) => ({ ...prev, isRunningQuery: true, error: null }));
        try {
          toast.info('Running query...');
          const response = await fetch('/api/sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: content })
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
          }

          toast.success('Query executed successfully!');
          console.log('Query results:', result.results);
          setMetadata((prev) => ({ ...prev, results: result.results, error: null, isRunningQuery: false }));
        } catch (error: any) {
          console.error('Failed to run query:', error);
          toast.error(`Failed to run query: ${error.message}`);
          setMetadata((prev) => ({ ...prev, results: null, error: error.message, isRunningQuery: false }));
        }
      }
    },
    {
      icon: <span>📄</span>, // Placeholder icon
      description: 'View Results',
      onClick: ({ metadata }) => {
        if (metadata?.isRunningQuery) {
          toast.info('Query is currently running.');
          return;
        }
        if (metadata?.results) {
          // TODO: Implement a proper modal or display area for results
          // For now, using alert and console.log
          toast.success('Displaying results (see alert/console).');
          console.log('Viewing results:', metadata.results);
          alert(`Results:
${JSON.stringify(metadata.results, null, 2)}`);
        } else if (metadata?.error) {
          toast.error(`Error from previous query run: ${metadata.error}`);
        } else {
          toast.info('No results to display. Run a query first.');
        }
      },
      isDisabled: ({ metadata }) => !!metadata?.isRunningQuery
    }
  ],
  toolbar: [
    // TODO: Add toolbar actions if needed
  ]
});
