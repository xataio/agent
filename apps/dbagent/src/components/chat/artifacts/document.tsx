import { memo } from 'react';

import { FileIcon, LoaderIcon, MessageCircleIcon, PencilIcon } from 'lucide-react';
import type { ArtifactKind } from './artifact';
import { useArtifact } from './use-artifact';

const getActionText = (type: 'create' | 'update' | 'request-suggestions', tense: 'present' | 'past') => {
  switch (type) {
    case 'create':
      return tense === 'present' ? 'Creating' : 'Created';
    case 'update':
      return tense === 'present' ? 'Updating' : 'Updated';
    case 'request-suggestions':
      return tense === 'present' ? 'Adding suggestions' : 'Added suggestions to';
    default:
      return null;
  }
};

interface DocumentToolResultProps {
  type: 'create' | 'update' | 'request-suggestions';
  result: { id: string; title: string; kind: ArtifactKind };
}

function PureDocumentToolResult({ type, result }: DocumentToolResultProps) {
  const { setArtifact } = useArtifact();

  return (
    <button
      type="button"
      className="bg-background flex w-fit cursor-pointer flex-row items-start gap-3 rounded-xl border px-3 py-2"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();

        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };

        setArtifact({
          documentId: result.id,
          kind: result.kind,
          content: '',
          title: result.title,
          isVisible: true,
          status: 'idle',
          boundingBox
        });
      }}
    >
      <div className="text-muted-foreground mt-1">
        {type === 'create' ? (
          <FileIcon />
        ) : type === 'update' ? (
          <PencilIcon />
        ) : type === 'request-suggestions' ? (
          <MessageCircleIcon />
        ) : null}
      </div>
      <div className="text-left">{`${getActionText(type, 'past')} "${result.title}"`}</div>
    </button>
  );
}

export const DocumentToolResult = memo(PureDocumentToolResult, () => true);

interface DocumentToolCallProps {
  type: 'create' | 'update' | 'request-suggestions';
  args: { title: string };
}

function PureDocumentToolCall({ type, args }: DocumentToolCallProps) {
  const { setArtifact } = useArtifact();

  return (
    <button
      type="button"
      className="cursor pointer flex w-fit flex-row items-start justify-between gap-3 rounded-xl border px-3 py-2"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();

        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };

        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          isVisible: true,
          boundingBox
        }));
      }}
    >
      <div className="flex flex-row items-start gap-3">
        <div className="mt-1 text-zinc-500">
          {type === 'create' ? (
            <FileIcon />
          ) : type === 'update' ? (
            <PencilIcon />
          ) : type === 'request-suggestions' ? (
            <MessageCircleIcon />
          ) : null}
        </div>

        <div className="text-left">{`${getActionText(type, 'present')} ${args.title ? `"${args.title}"` : ''}`}</div>
      </div>

      <div className="mt-1 animate-spin">
        <LoaderIcon />
      </div>
    </button>
  );
}

export const DocumentToolCall = memo(PureDocumentToolCall, () => true);
