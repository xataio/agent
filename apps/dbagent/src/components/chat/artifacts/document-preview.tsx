'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@xata.io/components';
import equal from 'fast-deep-equal';
import { FileIcon, FullscreenIcon, LoaderIcon } from 'lucide-react';
import { memo, MouseEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { ArtifactDocument } from '~/lib/db/schema';
import { fetcher } from '../utils';
import { ArtifactKind, UIArtifact } from './artifact';
import { DocumentToolCall, DocumentToolResult } from './document';
import { InlineDocumentSkeleton } from './document-skeleton';
import { SpreadsheetEditor } from './sheet/editor';
import { Editor } from './text/editor';
import { useArtifact } from './use-artifact';

interface DocumentPreviewProps {
  projectId: string;
  result?: any;
  args?: any;
}

export function DocumentPreview({ projectId, result, args }: DocumentPreviewProps) {
  const { artifact, setArtifact } = useArtifact();

  const { data: documents, isLoading: isDocumentsFetching } = useQuery<Array<ArtifactDocument>>({
    queryKey: ['document', result?.id],
    queryFn: () => {
      if (!result) return [];
      return fetcher(`/api/artifact?id=${result.id}`);
    },
    enabled: !!result
  });

  const previewDocument = useMemo(() => documents?.[0], [documents]);
  const hitboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    if (artifact.documentId && boundingBox) {
      setArtifact((artifact) => ({
        ...artifact,
        boundingBox: {
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height
        }
      }));
    }
  }, [artifact.documentId, setArtifact]);

  if (artifact.isVisible) {
    if (result) {
      return <DocumentToolResult type="create" result={{ id: result.id, title: result.title, kind: result.kind }} />;
    }

    if (args) {
      return <DocumentToolCall type="create" args={{ title: args.title }} />;
    }
  }

  if (isDocumentsFetching) {
    return <LoadingSkeleton artifactKind={result.kind ?? args.kind} />;
  }

  const document: ArtifactDocument | null = previewDocument
    ? previewDocument
    : artifact.status === 'streaming'
      ? {
          projectId: projectId,
          title: artifact.title,
          kind: artifact.kind,
          content: artifact.content,
          id: artifact.documentId,
          createdAt: new Date(),
          userId: 'noop'
        }
      : null;

  if (!document) return <LoadingSkeleton artifactKind={artifact.kind} />;

  return (
    <div className="relative w-full cursor-pointer">
      <HitboxLayer hitboxRef={hitboxRef} result={result} setArtifact={setArtifact} />
      <DocumentHeader title={document.title} kind={document.kind} isStreaming={artifact.status === 'streaming'} />
      <DocumentContent document={document} />
    </div>
  );
}

const LoadingSkeleton = (_props: { artifactKind: ArtifactKind }) => (
  <div className="w-full">
    <div className="dark:bg-muted flex h-[57px] flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 p-4 dark:border-zinc-700">
      <div className="flex flex-row items-center gap-3">
        <div className="text-muted-foreground">
          <div className="bg-muted-foreground/20 size-4 animate-pulse rounded-md" />
        </div>
        <div className="bg-muted-foreground/20 h-4 w-24 animate-pulse rounded-lg" />
      </div>
      <div>
        <FullscreenIcon />
      </div>
    </div>

    <div className="bg-muted overflow-y-scroll rounded-b-2xl border border-t-0 p-8 pt-4 dark:border-zinc-700">
      <InlineDocumentSkeleton />
    </div>
  </div>
);

const PureHitboxLayer = ({
  hitboxRef,
  result,
  setArtifact
}: {
  hitboxRef: React.RefObject<HTMLDivElement | null>;
  result: any;
  setArtifact: (updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => void;
}) => {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const boundingBox = event.currentTarget.getBoundingClientRect();

      setArtifact((artifact) =>
        artifact.status === 'streaming'
          ? { ...artifact, isVisible: true }
          : {
              ...artifact,
              title: result.title,
              documentId: result.id,
              kind: result.kind,
              isVisible: true,
              boundingBox: {
                left: boundingBox.x,
                top: boundingBox.y,
                width: boundingBox.width,
                height: boundingBox.height
              }
            }
      );
    },
    [setArtifact, result]
  );

  return (
    <div
      className="absolute left-0 top-0 z-10 size-full rounded-xl"
      ref={hitboxRef}
      onClick={handleClick}
      role="presentation"
      aria-hidden="true"
    >
      <div className="flex w-full items-center justify-end p-4">
        <div className="absolute right-[9px] top-[13px] rounded-md p-2 hover:bg-zinc-100 hover:dark:bg-zinc-700">
          <FullscreenIcon />
        </div>
      </div>
    </div>
  );
};

const HitboxLayer = memo(PureHitboxLayer, (prevProps, nextProps) => {
  if (!equal(prevProps.result, nextProps.result)) return false;
  return true;
});

const PureDocumentHeader = ({ title, isStreaming }: { title: string; kind: ArtifactKind; isStreaming: boolean }) => (
  <div className="dark:bg-muted flex flex-row items-start justify-between gap-2 rounded-t-2xl border border-b-0 p-4 sm:items-center dark:border-zinc-700">
    <div className="flex flex-row items-start gap-3 sm:items-center">
      <div className="text-muted-foreground">
        {isStreaming ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : (
          <FileIcon />
        )}
      </div>
      <div className="-translate-y-1 font-medium sm:translate-y-0">{title}</div>
    </div>
    <div className="w-8" />
  </div>
);

const DocumentHeader = memo(PureDocumentHeader, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;

  return true;
});

const DocumentContent = ({ document }: { document: ArtifactDocument }) => {
  const { artifact } = useArtifact();

  const containerClassName = cn(
    'h-[257px] overflow-y-scroll border rounded-b-2xl dark:bg-muted border-t-0 dark:border-zinc-700',
    {
      'p-4 sm:px-14 sm:py-16': document.kind === 'text'
    }
  );

  const commonProps = {
    content: document.content ?? '',
    isCurrentVersion: true,
    currentVersionIndex: 0,
    status: artifact.status,
    saveContent: () => {},
    suggestions: []
  };

  return (
    <div className={containerClassName}>
      {document.kind === 'text' ? (
        <Editor {...commonProps} onSaveContent={() => {}} />
      ) : document.kind === 'sheet' ? (
        <div className="relative flex size-full flex-1 p-4">
          <div className="absolute inset-0">
            <SpreadsheetEditor {...commonProps} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
