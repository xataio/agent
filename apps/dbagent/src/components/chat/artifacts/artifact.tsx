import { UseChatHelpers } from '@ai-sdk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSidebar } from '@xata.io/components';
import type { UIMessage } from 'ai';
import { formatDistance } from 'date-fns';
import equal from 'fast-deep-equal';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useCallback, useEffect, useState } from 'react';
import { useDebounceCallback, useWindowSize } from 'usehooks-ts';
import { ArtifactDocument, MessageVote } from '~/lib/db/schema';
import { MultimodalInput } from '../multimodal-input';
import { fetcher } from '../utils';
import { ArtifactActions } from './artifact-actions';
import { ArtifactCloseButton } from './artifact-close-button';
import { ArtifactMessages } from './artifact-messages';
import { sheetArtifact } from './sheet/client';
import { textArtifact } from './text/client';
import { Toolbar } from './toolbar';
import { useArtifact } from './use-artifact';
import { VersionFooter } from './version-footer';

export const artifactDefinitions = [textArtifact, sheetArtifact];
export type ArtifactKind = (typeof artifactDefinitions)[number]['kind'];

export interface UIArtifact {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

function PureArtifact({
  chatId,
  projectId,
  input,
  setInput,
  handleSubmit,
  status,
  stop,
  append,
  messages,
  setMessages,
  reload,
  votes
}: {
  chatId: string;
  projectId: string;
  input: string;
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: UseChatHelpers['stop'];
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  votes: Array<MessageVote> | undefined;
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  reload: UseChatHelpers['reload'];
}) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
  const queryClient = useQueryClient();

  const { data: documents, isLoading: isDocumentsFetching } = useQuery({
    queryKey: ['documents', artifact.documentId],
    queryFn: () => fetcher(`/api/artifact?id=${artifact.documentId}`),
    enabled: artifact.documentId !== 'init' && artifact.status !== 'streaming'
  });

  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [document, setDocument] = useState<ArtifactDocument | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

  const { open: isSidebarOpen } = useSidebar();

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? ''
        }));
      }
    }
  }, [documents, setArtifact]);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['documents', artifact.documentId] });
  }, [artifact.status, queryClient, artifact.documentId]);

  const [isContentDirty, setIsContentDirty] = useState(false);

  const handleContentChange = useCallback(
    async (updatedContent: string) => {
      if (!artifact) return;

      const currentDocuments = queryClient.getQueryData<Array<ArtifactDocument>>(['documents', artifact.documentId]);
      if (!currentDocuments) return;

      const currentDocument = currentDocuments.at(-1);
      if (!currentDocument || !currentDocument.content) {
        setIsContentDirty(false);
        return;
      }

      if (currentDocument.content !== updatedContent) {
        await fetch(`/api/artifact?id=${artifact.documentId}&projectId=${projectId}`, {
          method: 'POST',
          body: JSON.stringify({
            title: artifact.title,
            content: updatedContent,
            kind: artifact.kind
          })
        });

        setIsContentDirty(false);

        const newDocument = {
          ...currentDocument,
          content: updatedContent,
          createdAt: new Date()
        };

        queryClient.setQueryData(['documents', artifact.documentId], [...currentDocuments, newDocument]);
      }
    },
    [artifact, queryClient]
  );

  const debouncedHandleContentChange = useDebounceCallback(handleContentChange, 2000);

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (document && updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          void debouncedHandleContentChange(updatedContent);
        } else {
          void handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange]
  );

  function getDocumentContentById(index: number) {
    if (!documents) return '';
    if (!documents[index]) return '';
    return documents[index].content ?? '';
  }

  const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
    if (!documents) return;

    if (type === 'latest') {
      setCurrentVersionIndex(documents.length - 1);
      setMode('edit');
    }

    if (type === 'toggle') {
      setMode((mode) => (mode === 'edit' ? 'diff' : 'edit'));
    }

    if (type === 'prev') {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === 'next') {
      if (currentVersionIndex < documents.length - 1) {
        setCurrentVersionIndex((index) => index + 1);
      }
    }
  };

  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  /*
   * NOTE: if there are no documents, or if
   * the documents are being fetched, then
   * we mark it as the current version.
   */

  const isCurrentVersion = documents && documents.length > 0 ? currentVersionIndex === documents.length - 1 : true;

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  const artifactDefinition = artifactDefinitions.find((definition) => definition.kind === artifact.kind);

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  useEffect(() => {
    if (artifact.documentId !== 'init') {
      if (artifactDefinition.initialize) {
        artifactDefinition.initialize({
          documentId: artifact.documentId,
          setMetadata
        });
      }
    }
  }, [artifact.documentId, artifactDefinition, setMetadata]);

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          data-testid="artifact"
          className="fixed left-0 top-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
        >
          {!isMobile && (
            <motion.div
              className="bg-background fixed h-dvh"
              initial={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0
              }}
              animate={{ width: windowWidth, right: 0 }}
              exit={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0
              }}
            />
          )}

          {!isMobile && (
            <motion.div
              className="bg-muted dark:bg-background relative h-dvh w-[400px] shrink-0"
              initial={{ opacity: 0, x: 10, scale: 1 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  delay: 0.2,
                  type: 'spring',
                  stiffness: 200,
                  damping: 30
                }
              }}
              exit={{
                opacity: 0,
                x: 0,
                scale: 1,
                transition: { duration: 0 }
              }}
            >
              <AnimatePresence>
                {!isCurrentVersion && (
                  <motion.div
                    className="absolute left-0 top-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <div className="flex h-full flex-col items-center justify-between gap-4">
                <ArtifactMessages
                  projectId={projectId}
                  chatId={chatId}
                  status={status}
                  votes={votes}
                  messages={messages}
                  setMessages={setMessages}
                  reload={reload}
                  artifactStatus={artifact.status}
                />

                <form className="relative flex w-full flex-row items-end gap-2 px-4 pb-4">
                  <MultimodalInput
                    chatId={chatId}
                    input={input}
                    setInput={setInput}
                    handleSubmit={handleSubmit}
                    status={status}
                    stop={stop}
                    messages={messages}
                    append={append}
                    className="bg-background dark:bg-muted"
                    setMessages={setMessages}
                  />
                </form>
              </div>
            </motion.div>
          )}

          <motion.div
            className="dark:bg-muted bg-background fixed flex h-dvh flex-col overflow-y-scroll border-zinc-200 md:border-l dark:border-zinc-700"
            initial={
              isMobile
                ? {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50
                  }
                : {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50
                  }
            }
            animate={
              isMobile
                ? {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth : 'calc(100dvw)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 200,
                      damping: 30,
                      duration: 5000
                    }
                  }
                : {
                    opacity: 1,
                    x: 400,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth - 400 : 'calc(100dvw-400px)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 200,
                      damping: 30,
                      duration: 5000
                    }
                  }
            }
            exit={{
              opacity: 0,
              scale: 0.5,
              transition: {
                delay: 0.1,
                type: 'spring',
                stiffness: 600,
                damping: 30
              }
            }}
          >
            <div className="flex flex-row items-start justify-between p-2">
              <div className="flex flex-row items-start gap-4">
                <ArtifactCloseButton />

                <div className="flex flex-col">
                  <div className="font-medium">{artifact.title}</div>

                  {isContentDirty ? (
                    <div className="text-muted-foreground text-sm">Saving changes...</div>
                  ) : document ? (
                    <div className="text-muted-foreground text-sm">
                      {`Updated ${formatDistance(new Date(document.createdAt), new Date(), {
                        addSuffix: true
                      })}`}
                    </div>
                  ) : (
                    <div className="bg-muted-foreground/20 mt-2 h-3 w-32 animate-pulse rounded-md" />
                  )}
                </div>
              </div>

              <ArtifactActions
                artifact={artifact}
                currentVersionIndex={currentVersionIndex}
                handleVersionChange={handleVersionChange}
                isCurrentVersion={isCurrentVersion}
                mode={mode}
                metadata={metadata}
                setMetadata={setMetadata}
              />
            </div>

            <div className="dark:bg-muted bg-background h-full !max-w-full items-center overflow-y-scroll">
              <artifactDefinition.content
                title={artifact.title}
                content={isCurrentVersion ? artifact.content : getDocumentContentById(currentVersionIndex)}
                mode={mode}
                status={artifact.status}
                currentVersionIndex={currentVersionIndex}
                suggestions={[]}
                onSaveContent={saveContent}
                isInline={false}
                isCurrentVersion={isCurrentVersion}
                getDocumentContentById={getDocumentContentById}
                isLoading={isDocumentsFetching && !artifact.content}
                metadata={metadata}
                setMetadata={setMetadata}
              />

              <AnimatePresence>
                {isCurrentVersion && (
                  <Toolbar
                    isToolbarVisible={isToolbarVisible}
                    setIsToolbarVisible={setIsToolbarVisible}
                    append={append}
                    status={status}
                    stop={stop}
                    setMessages={setMessages}
                    artifactKind={artifact.kind}
                  />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!isCurrentVersion && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (prevProps.input !== nextProps.input) return false;
  if (!equal(prevProps.messages, nextProps.messages.length)) return false;

  return true;
});
