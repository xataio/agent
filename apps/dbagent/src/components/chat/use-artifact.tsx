'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { UIArtifact } from './artifact';

export const initialArtifactData: UIArtifact = {
  documentId: 'init',
  content: '',
  kind: 'text',
  title: '',
  status: 'idle',
  isVisible: false,
  boundingBox: {
    top: 0,
    left: 0,
    width: 0,
    height: 0
  }
};

type Selector<T> = (state: UIArtifact) => T;

export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
  const { data: localArtifact } = useQuery({
    queryKey: ['artifact'],
    queryFn: () => null,
    initialData: initialArtifactData
  });

  const selectedValue = useMemo(() => {
    if (!localArtifact) return selector(initialArtifactData);
    return selector(localArtifact);
  }, [localArtifact, selector]);

  return selectedValue;
}

export function useArtifact() {
  const queryClient = useQueryClient();
  const { data: localArtifact } = useQuery({
    queryKey: ['artifact'],
    queryFn: () => null,
    initialData: initialArtifactData
  });

  const artifact = useMemo(() => {
    if (!localArtifact) return initialArtifactData;
    return localArtifact;
  }, [localArtifact]);

  const setArtifact = useCallback(
    (updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => {
      queryClient.setQueryData(['artifact'], (currentArtifact: UIArtifact | undefined) => {
        const artifactToUpdate = currentArtifact || initialArtifactData;

        if (typeof updaterFn === 'function') {
          return updaterFn(artifactToUpdate);
        }

        return updaterFn;
      });
    },
    [queryClient]
  );

  const { data: localArtifactMetadata } = useQuery<any>({
    queryKey: ['artifact-metadata', artifact.documentId],
    queryFn: () => null,
    enabled: !!artifact.documentId,
    initialData: null
  });

  const setLocalArtifactMetadata = useCallback(
    (metadata: any) => {
      queryClient.setQueryData(['artifact-metadata', artifact.documentId], metadata);
    },
    [queryClient, artifact.documentId]
  );

  return useMemo(
    () => ({
      artifact,
      setArtifact,
      metadata: localArtifactMetadata,
      setMetadata: setLocalArtifactMetadata
    }),
    [artifact, setArtifact, localArtifactMetadata, setLocalArtifactMetadata]
  );
}
