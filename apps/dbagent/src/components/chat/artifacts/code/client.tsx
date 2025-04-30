import { toast } from '@internal/components';
import { CopyIcon, LogsIcon, PlayIcon, RedoIcon, UndoIcon } from 'lucide-react';
import { QueryEditor } from '../../query-editor';
import { generateUUID } from '../../utils';
import { Artifact } from '../create-artifact';

type ConsoleOutput = {
  id: string;
  contents: Array<ConsoleOutputContent>;
  status: 'in_progress' | 'loading_packages' | 'completed' | 'failed';
};

type ConsoleOutputContent = {
  type: 'text';
  value: string;
};

interface Metadata {
  outputs: Array<ConsoleOutput>;
}

export const codeArtifact = new Artifact<'code', Metadata>({
  kind: 'code',
  description: 'Useful for code generation; Code execution is only available for python code.',
  initialize: async ({ setMetadata }) => {
    setMetadata({
      outputs: []
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'code-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible:
          draftArtifact.status === 'streaming' &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: 'streaming'
      }));
    }
  },
  content: ({ metadata, setMetadata, ...props }) => {
    return (
      <>
        <div className="px-1">
          <QueryEditor />
        </div>

        {metadata?.outputs && (
          <div className="mt-2 flex flex-col gap-2">
            {metadata.outputs.map((output) => (
              <div key={output.id} className="rounded border p-2">
                {output.status === 'in_progress' && <p>Running...</p>}
                {output.status === 'loading_packages' && <p>Loading packages...</p>}
                {output.status === 'completed' && (
                  <div>
                    {output.contents.map((content, index) => (
                      <div key={index}>
                        {content.type === 'text' ? <p>{content.value}</p> : <img src={content.value} alt="Output" />}
                      </div>
                    ))}
                  </div>
                )}
                {output.status === 'failed' && <p>Error: {output.contents[0]?.value}</p>}
              </div>
            ))}
          </div>
        )}
      </>
    );
  },
  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: 'Run',
      description: 'Execute code',
      onClick: async ({ content, setMetadata }) => {
        const runId = generateUUID();
        const outputContent: Array<ConsoleOutputContent> = [];

        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs,
            {
              id: runId,
              contents: [],
              status: 'in_progress'
            }
          ]
        }));

        try {
          // Run the code in a sandboxed environment
        } catch (error: any) {
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                id: runId,
                contents: [{ type: 'text', value: error.message }],
                status: 'failed'
              }
            ]
          }));
        }
      }
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      }
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      }
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy code to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      }
    }
  ],
  toolbar: [
    {
      icon: <LogsIcon />,
      description: 'Add logs',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Add logs to the code snippet for debugging'
        });
      }
    }
  ]
});
