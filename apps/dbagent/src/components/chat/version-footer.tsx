'use client';

import { Button } from '@internal/components';
import { useQueryClient } from '@tanstack/react-query';
import { isAfter } from 'date-fns';
import { motion } from 'framer-motion';
import { LoaderIcon } from 'lucide-react';
import { useState } from 'react';
import { useWindowSize } from 'usehooks-ts';
import { Document } from '~/lib/db/schema';
import { useArtifact } from './use-artifact';
import { getDocumentTimestampByIndex } from './utils';

interface VersionFooterProps {
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  documents: Array<Document> | undefined;
  currentVersionIndex: number;
}

export const VersionFooter = ({ handleVersionChange, documents, currentVersionIndex }: VersionFooterProps) => {
  const { artifact } = useArtifact();
  const queryClient = useQueryClient();

  const { width } = useWindowSize();
  const isMobile = width < 768;

  const [isMutating, setIsMutating] = useState(false);

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
          disabled={isMutating}
          onClick={async () => {
            setIsMutating(true);

            const response = await fetch(`/api/document?id=${artifact.documentId}`, {
              method: 'PATCH',
              body: JSON.stringify({
                timestamp: getDocumentTimestampByIndex(documents, currentVersionIndex)
              })
            });

            if (response.ok) {
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

            setIsMutating(false);
          }}
        >
          <div>Restore this version</div>
          {isMutating && (
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
