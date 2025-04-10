import { toast } from '@internal/components';
import { CopyIcon, SparklesIcon, UndoIcon } from 'lucide-react';
import { parse, unparse } from 'papaparse';
import { RedoIcon } from '~/components/icons';
import { Artifact } from '../../create-artifact';
import { SpreadsheetEditor } from '../../sheet-editor';

type Metadata = any;

export const sheetArtifact = new Artifact<'sheet', Metadata>({
  kind: 'sheet',
  description: 'Useful for working with spreadsheets',
  initialize: async () => {},
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === 'sheet-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming'
      }));
    }
  },
  content: ({ content, currentVersionIndex, isCurrentVersion, onSaveContent, status }) => {
    return (
      <SpreadsheetEditor
        content={content}
        currentVersionIndex={currentVersionIndex}
        isCurrentVersion={isCurrentVersion}
        saveContent={onSaveContent}
        status={status}
      />
    );
  },
  actions: [
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
      icon: <CopyIcon />,
      description: 'Copy as .csv',
      onClick: ({ content }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });

        const nonEmptyRows = parsed.data.filter((row) => row.some((cell) => cell.trim() !== ''));

        const cleanedCsv = unparse(nonEmptyRows);

        void navigator.clipboard.writeText(cleanedCsv);
        toast.success('Copied csv to clipboard!');
      }
    }
  ],
  toolbar: [
    {
      description: 'Format and clean data',
      icon: <SparklesIcon />,
      onClick: ({ appendMessage }) => {
        void appendMessage({
          role: 'user',
          content: 'Can you please format and clean the data?'
        });
      }
    }
    // {
    //   description: 'Analyze and visualize data',
    //   icon: <LineChartIcon />,
    //   onClick: ({ appendMessage }) => {
    //     void appendMessage({
    //       role: 'user',
    //       content: 'Can you please analyze and visualize the data by creating a chart?'
    //     });
    //   }
    // }
  ]
});
