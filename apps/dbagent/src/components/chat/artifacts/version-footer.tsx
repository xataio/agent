'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@xata.io/components';
import { isAfter } from 'date-fns';
import { motion } from 'framer-motion';
import { LoaderIcon } from 'lucide-react';
import { useWindowSize } from 'usehooks-ts';
import { ArtifactDocument } from '~/lib/db/schema';
import { getDocumentTimestampByIndex } from '../utils';
import { useArtifact } from './use-artifact';

interface VersionFooterProps {
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  documents: Array<ArtifactDocument> | undefined;
  currentVersionIndex: number;
}

export const VersionFooter = ({ handleVersionChange, documents, currentVersionIndex }: VersionFooterProps) => {
  const { artifact } = useArtifact();
  const queryClient = useQueryClient();

  const { width } = useWindowSize();
  const isMobile = width < 768;

  const { isPending, mutate } = useMutation({
    mutationFn: async ({ documentId, timestamp }: { documentId: string; timestamp: Date }) => {
      const response = await fetch(`/api/artifact?id=${documentId}&timestamp=${timestamp.toISOString()}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to restore version');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(
        ['documents', artifact.documentId],
        documents
          ? documents.filter((document) =>
              isAfter(
                new Date(document.createdAt),
                new Date(getDocumentTimestampByIndex(documents, currentVersionIndex))
              )
            )
          : []
      );
    }
  });

  if (!documents) return;

  return (
    <motion.div
      className="bg-background absolute bottom-0 z-50 flex w-full flex-col justify-between gap-4 border-t p-4 lg:flex-row"
      initial={{ y: isMobile ? 200 : 77 }}
      animate={{ y: 0 }}
      exit={{ y: isMobile ? 200 : 77 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      <div>
        <div>You are viewing a previous version</div>
        <div className="text-muted-foreground text-sm">Restore this version to make edits</div>
      </div>

      <div className="flex flex-row gap-4">
        <Button
          disabled={isPending}
          onClick={() => {
            mutate({
              documentId: artifact.documentId,
              timestamp: getDocumentTimestampByIndex(documents, currentVersionIndex)
            });
          }}
        >
          <div>Restore this version</div>
          {isPending && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            handleVersionChange('latest');
          }}
        >
          Back to latest version
        </Button>
      </div>
    </motion.div>
  );
};
